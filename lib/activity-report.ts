import type { EventLog, EventLogType } from "@/store/types";

export type ActivityDimension = "day" | "week" | "month";

export type TimeRangeMs = { start: number; end: number };

/** 本地自然日 YYYY-MM-DD */
export function formatYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 本地 `YYYY-MM-DD` 当日 [00:00, 23:59:59.999] */
export function parseLocalYmdToDayRange(ymd: string): TimeRangeMs | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const start = new Date(y, mo, d, 0, 0, 0, 0).getTime();
  if (Number.isNaN(start)) return null;
  const end = new Date(y, mo, d, 23, 59, 59, 999).getTime();
  return { start, end };
}

/** 本地 `YYYY-MM` 当月首尾 */
export function parseLocalYmToMonthRange(ym: string): TimeRangeMs | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  if (!Number.isFinite(y) || mo < 0 || mo > 11) return null;
  const start = new Date(y, mo, 1, 0, 0, 0, 0).getTime();
  const end = new Date(y, mo + 1, 0, 23, 59, 59, 999).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  return { start, end };
}

/**
 * 含 `ymd` 所在自然周（周一至周日，本地时区）。
 */
export function weekBoundsContainingLocalYmd(ymd: string): TimeRangeMs | null {
  const dayR = parseLocalYmdToDayRange(ymd);
  if (!dayR) return null;
  const anchor = new Date(dayR.start);
  const dow = anchor.getDay();
  const deltaToMonday = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(anchor);
  monday.setDate(monday.getDate() + deltaToMonday);
  const start = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const end = new Date(
    sunday.getFullYear(),
    sunday.getMonth(),
    sunday.getDate(),
    23,
    59,
    59,
    999
  ).getTime();
  return { start, end };
}

export function filterLogsByRange(
  logs: readonly EventLog[],
  range: TimeRangeMs
): EventLog[] {
  return logs.filter((l) => l.time >= range.start && l.time <= range.end);
}

export type DayGroupedLogs = { day: string; logs: EventLog[] };

/** 按自然日分组：日序新→旧；组内条目新→旧 */
export function groupLogsByLocalDayDescending(
  logs: readonly EventLog[]
): DayGroupedLogs[] {
  const sorted = [...logs].sort((a, b) => b.time - a.time);
  const map = new Map<string, EventLog[]>();
  for (const log of sorted) {
    const day = formatYmdLocal(new Date(log.time));
    const arr = map.get(day);
    if (arr) arr.push(log);
    else map.set(day, [log]);
  }
  const days = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
  return days.map((day) => ({ day, logs: map.get(day)! }));
}

export function countLogsByType(
  logs: readonly EventLog[]
): Record<EventLogType, number> {
  const base: Record<EventLogType, number> = {
    info: 0,
    decree: 0,
    battle: 0,
    treasury: 0,
  };
  for (const l of logs) {
    base[l.type] = (base[l.type] ?? 0) + 1;
  }
  return base;
}

function formatTimeHmLocal(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function formatExportedAtLocal(): string {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

export function buildRangeLabelLocal(range: TimeRangeMs): string {
  return `${formatYmdLocal(new Date(range.start))}_${formatYmdLocal(new Date(range.end))}`;
}

export function buildRangeHumanLabel(range: TimeRangeMs): string {
  const a = formatYmdLocal(new Date(range.start));
  const b = formatYmdLocal(new Date(range.end));
  return a === b ? a : `${a} ～ ${b}`;
}

export function logsToMarkdown(params: {
  logs: readonly EventLog[];
  rangeHuman: string;
  note?: string;
}): string {
  const { logs, rangeHuman, note } = params;
  const exportedAt = formatExportedAtLocal();
  const counts = countLogsByType(logs);
  const grouped = groupLogsByLocalDayDescending(logs);
  const lines: string[] = [
    "# 瀚翎帝国 · 勤政录",
    "",
    `- **范围**：${rangeHuman}（本机时区）`,
    `- **导出时间**：${exportedAt}`,
    `- **条数**：${logs.length}`,
    ...(note ? ["", `> ${note}`] : []),
    "",
    "## 摘要（按邸报类型）",
    "",
    `- 朱批 / 诏令（decree）：${counts.decree}`,
    `- 户部 / 内帑（treasury）：${counts.treasury}`,
    `- 边情 / 战报（battle）：${counts.battle}`,
    `- 起居注（info）：${counts.info}`,
    "",
  ];
  for (const { day, logs: dayLogs } of grouped) {
    lines.push(`## ${day}`, "");
    for (const log of dayLogs) {
      const city = log.cityName ? ` · ${log.cityName}` : "";
      lines.push(
        `### ${formatTimeHmLocal(log.time)} · ${log.type}${city}`,
        "",
        log.message,
        ""
      );
    }
  }
  return lines.join("\n");
}

export function logsToJsonExport(params: {
  logs: readonly EventLog[];
  range: TimeRangeMs;
  rangeHuman: string;
  note?: string;
}): string {
  const { logs, range, rangeHuman, note } = params;
  return JSON.stringify(
    {
      meta: {
        exportKind: "hanling-activity-journal",
        version: 1,
        exportedAt: new Date().toISOString(),
        rangeStart: range.start,
        rangeEnd: range.end,
        rangeHuman,
        count: logs.length,
        ...(note ? { note } : {}),
      },
      logs: [...logs].sort((a, b) => a.time - b.time),
    },
    null,
    2
  );
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string
): void {
  const blob = new Blob([content], {
    type: `${mime};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[/\\:?*"<>|]/g, "_");
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
