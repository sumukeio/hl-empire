import {
  getQuestDailyCount,
  isQuestFullyCompletedToday,
} from "@/store/map-store";
import type { City, Quest } from "@/store/types";
import { getQuestAffiliation } from "@/lib/quest-affiliation";
import { isTongwuSiCity } from "@/lib/tongwu-si";

export function cityDisplayName(city: Pick<City, "name" | "alias">): string {
  return city.alias?.trim() || city.name;
}

/** 分城战役任务是否仍可在该城勘合 */
export function canBatchCompleteQuestOnCity(
  city: City,
  quest: Pick<Quest, "id" | "occurrence" | "maxCompletionsPerDay">
): boolean {
  if (isQuestFullyCompletedToday(city, quest)) return false;
  const max = Math.max(1, quest.maxCompletionsPerDay ?? 1);
  return getQuestDailyCount(city, quest.id) < max;
}

export type BatchCampaignEligibility = {
  eligibleCityIds: string[];
  skippedCityIds: string[];
  totalStaminaCost: number;
};

/** 从勾选的城池中筛出可参战者（排除通务司；仅分城政务） */
export function resolveBatchCampaignEligibility(
  quest: Quest,
  cityIds: readonly string[],
  cities: readonly City[]
): BatchCampaignEligibility {
  if (getQuestAffiliation(quest) !== "city") {
    return { eligibleCityIds: [], skippedCityIds: [...cityIds], totalStaminaCost: 0 };
  }
  const eligibleCityIds: string[] = [];
  const skippedCityIds: string[] = [];
  for (const id of cityIds) {
    const city = cities.find((c) => c.id === id);
    if (!city || isTongwuSiCity(city)) {
      skippedCityIds.push(id);
      continue;
    }
    if (canBatchCompleteQuestOnCity(city, quest)) {
      eligibleCityIds.push(id);
    } else {
      skippedCityIds.push(id);
    }
  }
  return {
    eligibleCityIds,
    skippedCityIds,
    totalStaminaCost: quest.staminaCost * eligibleCityIds.length,
  };
}

export function getBatchStartBlockReason(input: {
  activeBatch: unknown;
  activeTimer: unknown;
  selectedCount: number;
  preview: BatchCampaignEligibility | null;
  stamina: number;
}): string | null {
  if (input.activeBatch) {
    return "尚有集群战役计时中，请先「呈报集群战役」或「撤点卯」。";
  }
  if (input.activeTimer) {
    return "军机处有未呈报的单机点卯，请回九州图志侧栏军机处先呈报奏折或撤点卯。";
  }
  if (input.selectedCount === 0) {
    return "请先在步骤 B 勾选至少一座参战城池。";
  }
  if (!input.preview || input.preview.eligibleCityIds.length === 0) {
    const n = input.selectedCount;
    return `已选 ${n} 座城池，但该任务在全部城池中均已办满，或一次性任务已完成，无法再次集群点卯。`;
  }
  if (input.stamina < input.preview.totalStaminaCost) {
    const n = input.preview.eligibleCityIds.length;
    return `体力不足：${n} 座可参战城共需 ${input.preview.totalStaminaCost} 点，当前 ${input.stamina} 点。`;
  }
  return null;
}

export function computeBatchCampaignTimerThresholds(
  quest: Pick<Quest, "minCompletionTime">,
  participantCount: number
): { T_standard: number; T_floor: number } {
  const n = Math.max(1, participantCount);
  const base = Math.max(1, Math.floor(quest.minCompletionTime ?? 10));
  const T_standard = base * n;
  const T_floor = T_standard * 0.5;
  return { T_standard, T_floor };
}
