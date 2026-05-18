const TZ = "Asia/Shanghai";

/** 北京时间自然日 YYYY-MM-DD */
export function getBeijingDateString(ms: number = Date.now()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(ms));
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export function isBeijingToday(ms: number): boolean {
  return getBeijingDateString(ms) === getBeijingDateString(Date.now());
}

/** 展示：2026-05-16 14:32:08 */
export function formatBeijingDateTime(ms: number): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(ms);
}

export function operationAtIso(ms: number = Date.now()): string {
  return new Date(ms).toISOString();
}
