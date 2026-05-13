import { CITY_STATUS_LABELS } from "@/lib/city-status";
import { todayKey } from "@/lib/today-key";
import { getQuestDailyCount } from "@/store/map-store";
import type { City, CityStatus, EventLog, Quest } from "@/store/types";

export type ImperialReviewInput = {
  exp: number;
  stamina: number;
  doneTaskTitles: string[];
  activeCities: City[];
  todayLogs: EventLog[];
};

function statusLabel(st: CityStatus): string {
  return CITY_STATUS_LABELS[st] ?? String(st);
}

/** 拼装「起居注」Markdown（太医院复盘）。 */
export function buildImperialReviewMarkdown(input: ImperialReviewInput): string {
  const tasksLine =
    input.doneTaskTitles.length > 0
      ? input.doneTaskTitles.join("、")
      : "（今日尚无已点卯之政务）";

  const cityBlocks =
    input.activeCities.length > 0
      ? input.activeCities
          .map((c) => {
            const aliasLine =
              c.alias?.trim() ? `·${c.alias.trim()}` : "";
            const memo =
              c.memo?.trim() ? c.memo.trim() : "（无）";
            return `### ${c.name}${aliasLine}
- 态势: ${statusLabel(c.status)}
- 度支 (CPA): ${c.cpa} | 线索 (粉): ${Math.max(0, Math.floor(c.leads ?? 0))} | 粮饷 (单): ${c.orders}
- 军机备忘: ${memo}`;
          })
          .join("\n\n")
      : "_（今日征战目标无已探明之城池，status 均为 0）_";

  const logLine =
    input.todayLogs.length > 0
      ? input.todayLogs.map((l) => l.message).join("，")
      : "（今日邸报无条目）";

  return `---
## 👑 瀚翎帝国·今日起居注
- **功勋/体力**: ${input.exp} / ${input.stamina}
- **执行政务**: ${tasksLine}

## 🏰 九州图志·征战目标实况
${cityBlocks}

## 📜 邸报摘要
${logLine}

---
`;
}

export function filterLogsFromToday(logs: EventLog[], now = new Date()): EventLog[] {
  const day = todayKey(now);
  return logs
    .filter((l) => todayKey(new Date(l.time)) === day)
    .sort((a, b) => b.time - a.time)
    .slice(0, 10);
}

/** 各城本日仍有勘合次数的军机（用于起居注；与跨日清零后的当日计数一致）。 */
export function collectTodayCompletedQuestLines(
  cities: City[],
  quests: Quest[]
): string[] {
  const titleById = new Map(quests.map((q) => [q.id, q.title]));
  const lines: string[] = [];
  for (const c of cities) {
    const ids = new Set<string>([
      ...Object.keys(c.questDailyCompletions ?? {}),
      ...c.completedQuestIds,
    ]);
    for (const qid of Array.from(ids)) {
      const n = getQuestDailyCount(c, qid);
      if (n < 1) continue;
      const t = titleById.get(qid) ?? qid;
      lines.push(n === 1 ? `【${c.name}】${t}` : `【${c.name}】${t} ×${n}`);
    }
  }
  return lines;
}
