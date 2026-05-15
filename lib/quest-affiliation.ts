import { isTongwuSiCity } from "@/lib/tongwu-si";
import type { City, Quest, QuestAffiliation } from "@/store/types";

export function normalizeQuestAffiliation(raw: unknown): QuestAffiliation {
  if (raw === "tongwu") return "tongwu";
  return "city";
}

/** 旧档无字段时：显式 affiliation → 标题【通务】前缀 → 默认分城 */
export function getQuestAffiliation(
  quest: Pick<Quest, "title"> & { affiliation?: QuestAffiliation }
): QuestAffiliation {
  if (quest.affiliation === "tongwu" || quest.affiliation === "city") {
    return quest.affiliation;
  }
  if (/^【通务】/.test(quest.title.trim())) return "tongwu";
  return "city";
}

export function questAffiliationLabel(aff: QuestAffiliation): string {
  return aff === "tongwu" ? "天下通务" : "分城政务";
}

export function filterQuestsByAffiliation(
  quests: readonly Quest[],
  affiliation: QuestAffiliation
): Quest[] {
  return quests.filter((q) => getQuestAffiliation(q) === affiliation);
}

/** 军机处：按当前主攻（通务司 vs 征战目标）筛选任务模板 */
export function filterQuestsForActiveCity(
  quests: readonly Quest[],
  activeCityId: string | null,
  cities: readonly City[]
): Quest[] {
  if (!activeCityId) return [];
  const city = cities.find((c) => c.id === activeCityId);
  if (!city) return [];
  const wantTongwu = isTongwuSiCity(city);
  return quests.filter((q) => {
    const aff = getQuestAffiliation(q);
    return wantTongwu ? aff === "tongwu" : aff === "city";
  });
}
