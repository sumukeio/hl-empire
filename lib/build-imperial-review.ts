import { CITY_STATUS_LABELS } from "@/lib/city-status";
import { todayKey } from "@/lib/today-key";
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
- 度支(CPA): ${c.cpa} | 粮饷(Orders): ${c.orders}
- 军机备忘: ${memo}`;
          })
          .join("\n\n")
      : "_（今日疆域无已探明之城池，status 均为 0）_";

  const logLine =
    input.todayLogs.length > 0
      ? input.todayLogs.map((l) => l.message).join("，")
      : "（今日邸报无条目）";

  return `---
## 👑 瀚翎帝国·今日起居注
- **功勋/体力**: ${input.exp} / ${input.stamina}
- **执行政务**: ${tasksLine}

## 🏰 疆域实况
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

/** 今日各城已勘合之军机（用于起居注）。 */
export function collectTodayCompletedQuestLines(
  cities: City[],
  quests: Quest[],
  now = new Date()
): string[] {
  const day = todayKey(now);
  const titleById = new Map(quests.map((q) => [q.id, q.title]));
  const lines: string[] = [];
  for (const c of cities) {
    for (const qid of c.completedQuestIds) {
      const ts = c.questCompletedAt[qid];
      if (typeof ts !== "number" || !Number.isFinite(ts) || ts <= 0) {
        continue;
      }
      if (todayKey(new Date(ts)) !== day) continue;
      const t = titleById.get(qid) ?? qid;
      lines.push(`【${c.name}】${t}`);
    }
  }
  return lines;
}
