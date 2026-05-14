import type { EventLog } from "@/store/types";
import { useEmperorStore } from "@/store/emperor-store";
import { getQuestDailyCount, useMapStore } from "@/store/map-store";

export type ApplyRevertResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_supported" | "state_mismatch" | "city_missing";
    };

/**
 * 执行单条邸报的撤回逻辑（不删日志；由 event-store 在成功后移除条目）。
 */
export function applyEventLogRevert(log: EventLog): ApplyRevertResult {
  const rev = log.revert;
  if (!rev) return { ok: false, reason: "not_supported" };

  if (rev.kind === "quest_complete") {
    const city = useMapStore.getState().cities.find((c) => c.id === rev.cityId);
    if (!city) {
      console.warn("[Hanling] 邸报撤回：城池不存在", { cityId: rev.cityId });
      return { ok: false, reason: "city_missing" };
    }
    if (getQuestDailyCount(city, rev.questId) < 1) {
      console.warn("[Hanling] 邸报撤回：本城该任务当日勘合次数已为 0（可能已跨日重置或手动取消）", {
        cityId: rev.cityId,
        questId: rev.questId,
      });
      return { ok: false, reason: "state_mismatch" };
    }
    const hasDopamine =
      typeof rev.postDopaminePool === "number" &&
      Number.isFinite(rev.postDopaminePool) &&
      typeof rev.dopamineExpFed === "number" &&
      Number.isFinite(rev.dopamineExpFed);
    if (hasDopamine) {
      const pool = useEmperorStore.getState().dopaminePool;
      if (pool !== rev.postDopaminePool) {
        console.warn("[Hanling] 邸报撤回：多巴胺池与记录不一致（可能已点卯多次）", {
          expected: rev.postDopaminePool,
          actual: pool,
        });
        return { ok: false, reason: "state_mismatch" };
      }
    }
    const dec = useMapStore.getState().decrementQuestCompletion(rev.cityId, rev.questId);
    if (!dec) {
      console.warn("[Hanling] 邸报撤回：decrementQuestCompletion 未生效", {
        cityId: rev.cityId,
        questId: rev.questId,
      });
      return { ok: false, reason: "state_mismatch" };
    }
    useEmperorStore.getState().revertQuestCompletionEffects({
      staminaRestored: rev.staminaRestored,
      expSubtracted: rev.expSubtracted,
      tokensSubtracted: rev.tokensSubtracted,
      postDopaminePool: rev.postDopaminePool,
      dopamineExpFed: rev.dopamineExpFed,
      dopamineDrained: rev.dopamineDrained,
      moraleLost: rev.moraleLost,
      healthLost: rev.healthLost,
    });
    return { ok: true };
  }

  return { ok: false, reason: "not_supported" };
}
