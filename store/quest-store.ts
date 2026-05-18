import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { todayKey } from "@/lib/today-key";
import {
  getQuestAffiliation,
  normalizeQuestAffiliation,
} from "@/lib/quest-affiliation";
import {
  getQuestCategory,
  normalizeQuestCategory,
} from "@/lib/quest-category";
import { isTongwuSiCity } from "@/lib/tongwu-si";
import {
  getQuestCampaignPhase,
  isOpenLearningSystemQuest,
  normalizeCampaignPhase,
} from "@/lib/campaign-phase";
import {
  computeBatchCampaignTimerThresholds,
  resolveBatchCampaignEligibility,
} from "@/lib/batch-campaign";
import { buildCourtDispatchDecree } from "@/lib/court-dispatch-log";
import { cityDisplayName } from "@/lib/batch-campaign";
import {
  newWorkSessionId,
  recordBatchTimerStart,
  recordQuestTimerStart,
  recordWorkOp,
} from "@/lib/work-session-recorder";
import { parseBulkQuestText } from "@/lib/parse-bulk-quest-lines";
import {
  classifyIndustrialSectorFromQuestTitle,
  totalVassalDailyTribute,
} from "@/lib/city-industry";

import { useEmperorStore } from "./emperor-store";
import { useEventStore } from "./event-store";
import { useMapStore, getQuestDailyCount } from "./map-store";
import type {
  CampaignPhase,
  Quest,
  QuestAffiliation,
  QuestCategory,
  QuestCompensationType,
  QuestOccurrence,
  QuestPatch,
  QuestPeriod,
} from "./types";

const CAMPAIGN_PHASE_SORT_BASE: Record<CampaignPhase, number> = {
  PRE_LAUNCH: 0,
  POST_LAUNCH: 1000,
  ON_LEAD: 2000,
  ON_ORDER: 3000,
};
import {
  buildDefaultMvaQuestsFromSeeds,
  defaultMvaQuestIdSet,
  maxFromOccurrence,
} from "./default-mva-quests";
import { formatTaels } from "@/lib/format-taels";

const PERIODS_ALL: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

/** 单次政务累计暂停不得超过 2 分钟；暂停不计入用时 */
export const QUEST_TIMER_MAX_PAUSE_MS = 2 * 60 * 1000;

export type ActiveQuestTimer = {
  questId: string;
  startTime: number;
  /** 已结束的暂停片段累计毫秒（不含当前暂停片段） */
  pausedMs: number;
  /** 当前暂停开始时间；null 表示未暂停 */
  pauseStartedAt: number | null;
  /** 勤政录政务工时行 id（quest_work_session.client_session_id） */
  clientSessionId: string;
};

/** 集团军集群点卯：多城同一战役任务共用一个计时器 */
export type ActiveBatchCampaignTimer = ActiveQuestTimer & {
  cityIds: string[];
};

export type BatchCampaignStartResult =
  | {
      ok: true;
      participantCount: number;
      skippedCount: number;
      T_standard: number;
      T_floor: number;
    }
  | { ok: false; reason: string };

function clampPauseCommitted(ms: number): number {
  return Math.max(
    0,
    Math.min(QUEST_TIMER_MAX_PAUSE_MS, Math.floor(Number.isFinite(ms) ? ms : 0))
  );
}

/** 不计暂停的政务有效用时（毫秒） */
export function getQuestTimerEffectiveElapsedMs(
  timer: ActiveQuestTimer,
  now: number
): number {
  const pausedCommitted = clampPauseCommitted(timer.pausedMs);
  let currentPause = 0;
  if (
    timer.pauseStartedAt != null &&
    Number.isFinite(timer.pauseStartedAt)
  ) {
    const raw = Math.max(0, now - timer.pauseStartedAt);
    const pauseCap = Math.max(0, QUEST_TIMER_MAX_PAUSE_MS - pausedCommitted);
    currentPause = Math.min(raw, pauseCap);
  }
  return Math.max(0, now - timer.startTime - pausedCommitted - currentPause);
}

/** 当前已用暂停预算（毫秒），含进行中的暂停片段（封顶 2 分钟） */
export function getQuestTimerPauseBudgetUsedMs(
  timer: ActiveQuestTimer,
  now: number
): number {
  const pausedCommitted = clampPauseCommitted(timer.pausedMs);
  let currentPause = 0;
  if (
    timer.pauseStartedAt != null &&
    Number.isFinite(timer.pauseStartedAt)
  ) {
    const raw = Math.max(0, now - timer.pauseStartedAt);
    const pauseCap = Math.max(0, QUEST_TIMER_MAX_PAUSE_MS - pausedCommitted);
    currentPause = Math.min(raw, pauseCap);
  }
  return Math.min(QUEST_TIMER_MAX_PAUSE_MS, pausedCommitted + currentPause);
}

function parseActiveBatchCampaign(
  raw: unknown
): ActiveBatchCampaignTimer | null {
  const base = parseActiveTimer(raw);
  if (!base) return null;
  const o = raw as Record<string, unknown>;
  const cityIds = Array.isArray(o.cityIds)
    ? o.cityIds.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  if (cityIds.length === 0) return null;
  return { ...base, cityIds };
}

function parseActiveTimer(raw: unknown): ActiveQuestTimer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const questId = typeof o.questId === "string" ? o.questId : "";
  const startTime =
    typeof o.startTime === "number" && Number.isFinite(o.startTime)
      ? o.startTime
      : NaN;
  if (!questId || !Number.isFinite(startTime)) return null;
  const pausedMs = clampPauseCommitted(
    typeof o.pausedMs === "number" && Number.isFinite(o.pausedMs)
      ? o.pausedMs
      : 0
  );
  const pauseStartedAt =
    typeof o.pauseStartedAt === "number" && Number.isFinite(o.pauseStartedAt)
      ? o.pauseStartedAt
      : null;
  const clientSessionId =
    typeof o.clientSessionId === "string" && o.clientSessionId.length > 0
      ? o.clientSessionId
      : newWorkSessionId();
  return { questId, startTime, pausedMs, pauseStartedAt, clientSessionId };
}

function computeQuestMeritForCity(
  quest: Quest,
  activeCityId: string
): { meritWithAgri: number; baseMerit: number } {
  const emperor = useEmperorStore.getState();
  const mvaBonus = emperor.isNomadMode && quest.id.startsWith("quest-mva-");
  const baseMerit = mvaBonus
    ? Math.round(quest.expReward * 1.2)
    : quest.expReward;
  const cityForBuff = useMapStore
    .getState()
    .cities.find((c) => c.id === activeCityId);
  const agriLv = Math.max(
    0,
    Math.min(10, Math.floor(cityForBuff?.agriLevel ?? 0))
  );
  const meritWithAgri = Math.max(
    0,
    Math.round(baseMerit * (1 + agriLv * 0.05))
  );
  return { meritWithAgri, baseMerit };
}

function emitIndustrialProgressForQuest(
  quest: Quest,
  activeCityId: string,
  baseMerit: number
) {
  const sector = classifyIndustrialSectorFromQuestTitle(quest.title);
  if (!sector) return;
  const map = useMapStore.getState();
  const ups = map.applyIndustrialQuestProgress(
    activeCityId,
    sector,
    baseMerit
  );
  const cityForBuff = map.cities.find((c) => c.id === activeCityId);
  const display = cityForBuff?.alias?.trim() || cityForBuff?.name || "本城";
  for (const u of ups) {
    useEventStore.getState().addLog(
      `【${u.ministry}】圣上勤政，【${display}】${u.industryLabel}等级提升至 ${u.newLevel} 级。`,
      "decree"
    );
  }
}

export type BulkAddQuestsResult = {
  added: number;
  errors: Array<{ line: number; message: string }>;
};

function newQuestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `quest-${crypto.randomUUID()}`;
  }
  return `quest-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** 首次安装或无可读存档时的默认军机任务（祖宗之法 · 政务清单 31 项）。 */
export function createDefaultQuests(): Quest[] {
  return buildDefaultMvaQuestsFromSeeds();
}

export function createEmptyQuest(
  partial?: Partial<Omit<Quest, "id" | "completed">>
): Quest {
  const period =
    partial?.period && PERIODS_ALL.includes(partial.period)
      ? partial.period
      : "早朝";
  const occurrence: QuestOccurrence =
    partial?.occurrence === "one_time" ||
    partial?.occurrence === "daily_once" ||
    partial?.occurrence === "daily_multiple"
      ? partial.occurrence
      : "daily_once";
  const compensationType: QuestCompensationType =
    partial?.compensationType === "absolute" ||
    partial?.compensationType === "compensable"
      ? partial.compensationType
      : "compensable";
  const minCompletionTime =
    typeof partial?.minCompletionTime === "number" &&
    Number.isFinite(partial.minCompletionTime)
      ? Math.max(1, Math.floor(partial.minCompletionTime))
      : 10;
  const maxCompletionsPerDay =
    typeof partial?.maxCompletionsPerDay === "number" &&
    Number.isFinite(partial.maxCompletionsPerDay)
      ? Math.max(1, Math.min(99, Math.floor(partial.maxCompletionsPerDay)))
      : maxFromOccurrence(occurrence);
  const title = partial?.title ?? "新军机";
  const id = newQuestId();
  const category: QuestCategory =
    partial?.category != null
      ? normalizeQuestCategory(partial.category)
      : getQuestCategory({ id, title });
  const affiliation: QuestAffiliation =
    partial?.affiliation != null
      ? normalizeQuestAffiliation(partial.affiliation)
      : getQuestAffiliation({ affiliation: undefined, title });
  const campaignPhase =
    partial?.campaignPhase != null
      ? normalizeCampaignPhase(partial.campaignPhase)
      : undefined;
  return {
    id,
    period,
    title,
    completed: false,
    expReward:
      typeof partial?.expReward === "number" && partial.expReward >= 0
        ? partial.expReward
        : 10,
    staminaCost:
      typeof partial?.staminaCost === "number" && partial.staminaCost >= 0
        ? partial.staminaCost
        : 5,
    minCompletionTime,
    compensationType,
    occurrence,
    sortOrder:
      typeof partial?.sortOrder === "number" && Number.isFinite(partial.sortOrder)
        ? partial.sortOrder
        : 0,
    maxCompletionsPerDay,
    category,
    affiliation,
    ...(campaignPhase ? { campaignPhase } : {}),
  };
}

function normalizePeriod(p: unknown): QuestPeriod {
  if (typeof p === "string" && PERIODS_ALL.includes(p as QuestPeriod)) {
    return p as QuestPeriod;
  }
  return "早朝";
}

function normalizeOccurrence(x: unknown): QuestOccurrence {
  if (x === "one_time" || x === "daily_once" || x === "daily_multiple") {
    return x;
  }
  return "daily_once";
}

function normalizeCompensation(x: unknown): QuestCompensationType {
  if (x === "absolute" || x === "compensable") {
    return x;
  }
  return "compensable";
}

export function migrateQuest(raw: unknown): Quest {
  const r = raw as Record<string, unknown>;
  const occurrence = normalizeOccurrence(r.occurrence);
  const compensationType = normalizeCompensation(r.compensationType);
  const minCompletionTime =
    typeof r.minCompletionTime === "number" && Number.isFinite(r.minCompletionTime)
      ? Math.max(1, Math.floor(r.minCompletionTime))
      : 10;
  const maxCompletionsPerDay =
    typeof r.maxCompletionsPerDay === "number" && Number.isFinite(r.maxCompletionsPerDay)
      ? Math.max(1, Math.min(99, Math.floor(r.maxCompletionsPerDay)))
      : maxFromOccurrence(occurrence);
  const id = typeof r.id === "string" ? r.id : newQuestId();
  const title = typeof r.title === "string" ? r.title : "未命名任务";
  const category =
    r.category !== undefined
      ? normalizeQuestCategory(r.category)
      : getQuestCategory({ id, title });
  const affiliation =
    r.affiliation !== undefined
      ? normalizeQuestAffiliation(r.affiliation)
      : getQuestAffiliation({ affiliation: undefined, title });
  const campaignPhase =
    r.campaignPhase !== undefined
      ? normalizeCampaignPhase(r.campaignPhase)
      : getQuestCampaignPhase({ id, title, campaignPhase: undefined });
  return {
    id,
    period: normalizePeriod(r.period),
    title,
    completed: r.completed === true,
    expReward:
      typeof r.expReward === "number" && Number.isFinite(r.expReward)
        ? Math.max(0, r.expReward)
        : 0,
    staminaCost:
      typeof r.staminaCost === "number" && Number.isFinite(r.staminaCost)
        ? Math.max(0, r.staminaCost)
        : 0,
    minCompletionTime,
    compensationType,
    occurrence,
    sortOrder:
      typeof r.sortOrder === "number" && Number.isFinite(r.sortOrder)
        ? r.sortOrder
        : 0,
    maxCompletionsPerDay,
    category,
    affiliation,
    campaignPhase,
  };
}

/** 按存档中的 id 顺序恢复各时辰内的 sortOrder（兼容无 sortOrder 的旧档） */
export function hydrateQuestSortOrderFromPersistOrder(
  quests: Quest[],
  rawPersisted: unknown[]
): Quest[] {
  const rawIds = rawPersisted
    .map((x) =>
      typeof x === "object" && x !== null && "id" in x
        ? String((x as { id: unknown }).id)
        : ""
    )
    .filter(Boolean);
  const pos = new Map<string, number>();
  const perP = new Map<QuestPeriod, number>();
  for (const id of rawIds) {
    const q = quests.find((x) => x.id === id);
    if (!q) continue;
    const c = perP.get(q.period) ?? 0;
    pos.set(id, c * 10);
    perP.set(q.period, c + 1);
  }
  return quests.map((q) => ({
    ...q,
    sortOrder: pos.has(q.id) ? pos.get(q.id)! : q.sortOrder,
  }));
}

export interface QuestState {
  quests: Quest[];
  lastLoginDate: string;
  /** 军机处当前主攻城池；勘合写入该城 `completedQuestIds`。 */
  activeCityId: string | null;
  /** 点卯后、呈报前：仅一桩政务可处于计时中 */
  activeTimer: ActiveQuestTimer | null;
  /** 集团军集群战役计时（与单机 `activeTimer` 互斥） */
  activeBatchCampaign: ActiveBatchCampaignTimer | null;
}

/** 军机勘合结算成功时返回，供邸报 `revert` 与 UI 使用 */
export type ToggleQuestCompletionMeta = {
  expGain: number;
  staminaRestored: number;
  tokensMinted: number;
  postDopaminePool: number;
  dopamineExpFed: number;
  /** 超时从多巴胺池实际扣下的点数（撤回时加回） */
  dopamineDrained?: number;
  /** 超时溢出扣掉的民心（撤回时加回） */
  moraleLost?: number;
  /** 不可弥补类溢出额外扣的健康（撤回时加回） */
  healthLost?: number;
};

/** 点卯仅开启计时器时返回（无勘合邸报） */
export type QuestTimerStartedAck = { timerStarted: true };

/** `toggleQuest` 在常规点卯（非 clearDay）时的返回值 */
export type ToggleQuestRunResult = false | "timer_busy" | QuestTimerStartedAck;

export type BatchCampaignCompleteMeta = ToggleQuestCompletionMeta & {
  citiesCompleted: number;
  citiesSkipped: number;
  totalMerit: number;
  T_actual: number;
  T_standard: number;
};

export interface QuestActions {
  addQuest: (quest: Quest) => void;
  removeQuest: (id: string) => void;
  updateQuest: (id: string, data: QuestPatch) => void;
  toggleQuest: (
    questId: string,
    opts?: { clearDay?: boolean }
  ) => boolean | ToggleQuestRunResult;
  /** 呈报奏折：按计时结算功勋、多巴胺奖惩；须与 `activeTimer` 一致 */
  completeQuestWithTimer: (
    questId: string
  ) => false | { shoddy: true } | ToggleQuestCompletionMeta;
  /** 改易方案：跳过计时分支，多巴胺按 `expReward * 2` 注入 */
  completeQuestWithSopOptimize: (
    questId: string
  ) => false | ToggleQuestCompletionMeta;
  /**
   * 点卯后 30 秒内撤本次点卯：退还体力、清除计时（未勘合）。
   * @returns 是否成功撤回
   */
  cancelActiveQuestTimer: (questId: string) => boolean;
  /** 暂停 / 继续：累计暂停不得超过 2 分钟 */
  toggleActiveQuestTimerPause: (questId: string) => boolean;
  /** 若当前暂停片段已达 2 分钟上限，自动结束暂停（供 UI 定时调用） */
  syncActiveQuestPauseIfExhausted: () => void;
  resetDailyQuests: () => void;
  /**
   * 启动收尾：确保通务司存在，并按当前枢密院任务 id 修剪各城勘合键。
   * 不再注入固定条数默认清单——以用户枢密院配置为准。
   */
  ensureQuestBootstrap: () => void;
  /** @deprecated 请用 `ensureQuestBootstrap` */
  ensureMvaQuestCatalog: () => void;
  /** 多行文本批量追加政务；`affiliation` 由枢密院当前分区决定。 */
  bulkAddQuests: (
    text: string,
    affiliation?: QuestAffiliation
  ) => BulkAddQuestsResult;
  bulkRemoveQuests: (ids: string[]) => void;
  /** 点卯计时中禁止切换主攻 */
  setActiveCityId: (id: string | null) => boolean;
  /** 同一时辰内按给定 id 顺序重排（用于拖动） */
  reorderQuestsInPeriod: (period: QuestPeriod, orderedIds: string[]) => void;
  /** 战役集群流水线内拖动排序（仅调整当前阶段任务 sortOrder） */
  reorderCampaignPhaseQuests: (
    phase: CampaignPhase,
    orderedIds: string[]
  ) => void;
  /** 集群点卯：对多城开启战役计时（扣总体力） */
  startBatchCampaignQuest: (
    questId: string,
    cityIds: string[]
  ) => BatchCampaignStartResult;
  /** 呈报集群战役：按批量工时结算并写入各城勘合 */
  completeBatchCampaignWithTimer: (
    questId: string
  ) => false | { shoddy: true } | BatchCampaignCompleteMeta;
  cancelBatchCampaignTimer: (questId: string) => boolean;
  toggleBatchCampaignTimerPause: (questId: string) => boolean;
  syncActiveBatchCampaignPauseIfExhausted: () => void;
}

export const useQuestStore = create<QuestState & QuestActions>()(
  persist(
    (set, get) => ({
      quests: [],
      lastLoginDate: "",
      activeCityId: null,
      activeTimer: null,
      activeBatchCampaign: null,
      addQuest: (quest) =>
        set((s) => {
          const id = quest.id || newQuestId();
          const period = normalizePeriod(quest.period);
          const blank = createEmptyQuest({
            title: quest.title,
            period,
            expReward: quest.expReward,
            staminaCost: quest.staminaCost,
            minCompletionTime: quest.minCompletionTime,
            compensationType: quest.compensationType,
            occurrence: quest.occurrence,
            maxCompletionsPerDay: quest.maxCompletionsPerDay,
            category: quest.category,
            affiliation: quest.affiliation,
          });
          const inP = s.quests.filter((q) => q.period === period);
          const minSo =
            inP.length === 0 ? 0 : Math.min(...inP.map((q) => q.sortOrder ?? 0));
          const next: Quest = {
            ...blank,
            id,
            period,
            title: quest.title?.trim() ? quest.title : blank.title,
            expReward: quest.expReward ?? blank.expReward,
            staminaCost: quest.staminaCost ?? blank.staminaCost,
            sortOrder: minSo - 1,
            maxCompletionsPerDay:
              typeof quest.maxCompletionsPerDay === "number" &&
              Number.isFinite(quest.maxCompletionsPerDay)
                ? Math.max(1, Math.min(99, Math.floor(quest.maxCompletionsPerDay)))
                : blank.maxCompletionsPerDay,
            category:
              quest.category != null
                ? normalizeQuestCategory(quest.category)
                : blank.category,
            affiliation:
              quest.affiliation != null
                ? normalizeQuestAffiliation(quest.affiliation)
                : blank.affiliation,
          };
          return { quests: [...s.quests, next] };
        }),
      removeQuest: (id) =>
        set((s) => {
          const t = s.activeTimer;
          let nextTimer = s.activeTimer;
          if (t?.questId === id) {
            const q = s.quests.find((x) => x.id === id);
            if (q) useEmperorStore.getState().addStamina(q.staminaCost);
            nextTimer = null;
          }
          return {
            quests: s.quests.filter((q) => q.id !== id),
            activeTimer: nextTimer,
          };
        }),
      updateQuest: (id, data) =>
        set((s) => ({
          quests: s.quests.map((q) => {
            if (q.id !== id) return q;
            const prevPeriod = q.period;
            const next = { ...q, ...data, id: q.id };
            next.period = normalizePeriod(next.period);
            if (next.period !== prevPeriod) {
              const inNew = s.quests.filter(
                (x) => x.period === next.period && x.id !== id
              );
              const minSo =
                inNew.length === 0
                  ? 0
                  : Math.min(...inNew.map((x) => x.sortOrder ?? 0));
              next.sortOrder = minSo - 1;
            }
            if (data.occurrence !== undefined && data.maxCompletionsPerDay === undefined) {
              next.maxCompletionsPerDay = maxFromOccurrence(
                normalizeOccurrence(next.occurrence)
              );
            }
            if (typeof next.minCompletionTime === "number") {
              next.minCompletionTime = Math.max(
                1,
                Math.floor(next.minCompletionTime)
              );
            }
            if (typeof next.maxCompletionsPerDay === "number") {
              next.maxCompletionsPerDay = Math.max(
                1,
                Math.min(99, Math.floor(next.maxCompletionsPerDay))
              );
            }
            next.occurrence = normalizeOccurrence(next.occurrence);
            next.compensationType = normalizeCompensation(next.compensationType);
            if (data.category !== undefined) {
              next.category = normalizeQuestCategory(next.category);
            }
            return next;
          }),
        })),
      toggleQuest: (questId, opts) => {
        const { activeCityId, quests, activeTimer, activeBatchCampaign } = get();
        if (activeBatchCampaign) return "timer_busy";
        if (!activeCityId) return false;
        const quest = quests.find((q) => q.id === questId);
        if (!quest) return false;
        const map = useMapStore.getState();
        const city = map.cities.find((c) => c.id === activeCityId);
        if (!city) return false;

        if (opts?.clearDay) {
          if (activeTimer?.questId === questId) {
            useEmperorStore.getState().addStamina(quest.staminaCost);
          }
          map.clearQuestCompletionsForDay(activeCityId, questId);
          set((s) => ({
            activeTimer:
              s.activeTimer?.questId === questId ? null : s.activeTimer,
          }));
          return true;
        }

        if (activeTimer) {
          if (activeTimer.questId !== questId) return "timer_busy";
          return false;
        }

        const max = Math.max(1, Math.min(99, quest.maxCompletionsPerDay ?? 1));
        const count = getQuestDailyCount(city, questId);
        if (count >= max) return false;

        const emperor = useEmperorStore.getState();
        if (emperor.stamina < quest.staminaCost) return false;

        emperor.consumeStamina(quest.staminaCost);
        const clientSessionId = newWorkSessionId();
        void recordQuestTimerStart({ clientSessionId, quest, city });
        set({
          activeTimer: {
            questId,
            startTime: Date.now(),
            pausedMs: 0,
            pauseStartedAt: null,
            clientSessionId,
          },
        });
        return { timerStarted: true };
      },
      syncActiveQuestPauseIfExhausted: () => {
        set((s) => {
          const t = s.activeTimer;
          if (!t?.pauseStartedAt) return s;
          const now = Date.now();
          const pausedCommitted = clampPauseCommitted(t.pausedMs);
          const seg = now - t.pauseStartedAt;
          const cap = Math.max(0, QUEST_TIMER_MAX_PAUSE_MS - pausedCommitted);
          if (seg < cap) return s;
          return {
            activeTimer: {
              ...t,
              pausedMs: pausedCommitted + cap,
              pauseStartedAt: null,
            },
          };
        });
      },
      cancelActiveQuestTimer: (questId) => {
        const t = get().activeTimer;
        if (!t || t.questId !== questId) return false;
        const q = get().quests.find((x) => x.id === questId);
        if (q) useEmperorStore.getState().addStamina(q.staminaCost);
        void recordWorkOp(t.clientSessionId, "timer_cancel", {
          staminaRefunded: q?.staminaCost ?? 0,
          status: "cancelled",
        });
        set({ activeTimer: null });
        return true;
      },
      toggleActiveQuestTimerPause: (questId) => {
        const t = get().activeTimer;
        if (!t || t.questId !== questId) return false;
        const now = Date.now();
        const pausedCommitted = clampPauseCommitted(t.pausedMs);
        if (t.pauseStartedAt != null) {
          const seg = now - t.pauseStartedAt;
          const cap = Math.max(0, QUEST_TIMER_MAX_PAUSE_MS - pausedCommitted);
          const add = Math.min(Math.max(0, seg), cap);
          void recordWorkOp(t.clientSessionId, "timer_resume");
          set({
            activeTimer: {
              ...t,
              pausedMs: pausedCommitted + add,
              pauseStartedAt: null,
            },
          });
          return true;
        }
        if (pausedCommitted >= QUEST_TIMER_MAX_PAUSE_MS) return false;
        void recordWorkOp(t.clientSessionId, "timer_pause");
        set({ activeTimer: { ...t, pauseStartedAt: now } });
        return true;
      },
      completeQuestWithTimer: (questId) => {
        get().syncActiveQuestPauseIfExhausted();
        const { activeCityId, quests, activeTimer } = get();
        if (!activeTimer || activeTimer.questId !== questId) return false;
        const quest = quests.find((q) => q.id === questId);
        if (!quest || !activeCityId) return false;
        const map = useMapStore.getState();
        const city = map.cities.find((c) => c.id === activeCityId);
        if (!city) return false;

        const now = Date.now();
        const T_actual =
          getQuestTimerEffectiveElapsedMs(activeTimer, now) / 60_000;
        const T_standard = Math.max(
          1,
          Math.floor(quest.minCompletionTime ?? 10)
        );
        const T_floor = T_standard * 0.5;

        if (T_actual < T_floor) {
          const voidMs = getQuestTimerEffectiveElapsedMs(activeTimer, now);
          void recordWorkOp(activeTimer.clientSessionId, "shoddy_void", {
            status: "voided",
            effectiveDurationMs: voidMs,
            effectiveDurationMinutes:
              Math.round((voidMs / 60_000) * 100) / 100,
            standardMinutes: T_standard,
          });
          useEmperorStore.getState().addStamina(quest.staminaCost);
          set({ activeTimer: null });
          return { shoddy: true };
        }

        const max = Math.max(1, Math.min(99, quest.maxCompletionsPerDay ?? 1));
        const count = getQuestDailyCount(city, questId);
        if (count >= max) {
          set({ activeTimer: null });
          return false;
        }

        const inc = map.incrementQuestCompletion(activeCityId, questId, max);
        if (!inc) {
          set({ activeTimer: null });
          return false;
        }

        const emperor = useEmperorStore.getState();
        const { meritWithAgri, baseMerit } = computeQuestMeritForCity(
          quest,
          activeCityId
        );

        emperor.addExp(meritWithAgri);
        const dMain = emperor.feedDopamineFromQuestReward(meritWithAgri);
        let tokensMinted = dMain.tokensMinted;
        let dopamineExpFed = dMain.dopamineExpFed;
        let postDopaminePool = dMain.postDopaminePool;

        let dopamineDrained = 0;
        let moraleLostForRevert = 0;
        let healthLostForRevert = 0;

        if (T_floor <= T_actual && T_actual < T_standard) {
          const diff = T_standard - T_actual;
          const bonusE = Math.max(0, Math.floor(diff));
          if (bonusE > 0) {
            const d2 = useEmperorStore
              .getState()
              .feedDopamineFromQuestReward(bonusE);
            tokensMinted += d2.tokensMinted;
            dopamineExpFed += d2.dopamineExpFed;
            postDopaminePool = d2.postDopaminePool;
            useEventStore.getState().addLog(
              `【内务府】圣上处理政务神速，多巴胺能量额外凝聚 ${bonusE.toLocaleString("zh-CN")} 点。`,
              "decree",
              { emphasis: "goldFlash" }
            );
          }
        } else if (T_actual > T_standard) {
          const overTime = Math.max(0, Math.floor(T_actual - T_standard));
          if (overTime > 0) {
            const pen = useEmperorStore
              .getState()
              .applyQuestTimerOvertimePenalty({
                overTimeMinutes: overTime,
                compensationType: quest.compensationType,
              });
            postDopaminePool = pen.postDopaminePool;
            dopamineDrained = pen.dopamineDrained;
            moraleLostForRevert = pen.moraleLost;
            healthLostForRevert = pen.healthLost;
            if (pen.dopamineDrained > 0) {
              useEventStore.getState().addLog(
                `【太医院】圣上处理政务冗长，心力损耗，多巴胺能量溢出 ${pen.dopamineDrained.toLocaleString("zh-CN")} 点。`,
                "battle"
              );
            }
            if (pen.overflow > 0) {
              useEventStore.getState().addLog(
                "【宗人府】政务迁延日久，蓄池枯竭，已致民心动摇。",
                "battle",
                { emphasis: "calamity" }
              );
            }
          }
        }

        if (T_actual > T_standard) {
          useEmperorStore.getState().pulseDopaminePool("drain");
        } else {
          useEmperorStore.getState().pulseDopaminePool("gain");
        }

        emitIndustrialProgressForQuest(quest, activeCityId, baseMerit);

        const effMs = getQuestTimerEffectiveElapsedMs(activeTimer, now);
        void recordWorkOp(activeTimer.clientSessionId, "complete", {
          status: "completed",
          effectiveDurationMs: effMs,
          effectiveDurationMinutes:
            Math.round((effMs / 60_000) * 100) / 100,
          standardMinutes: T_standard,
        });

        set({ activeTimer: null });

        return {
          expGain: meritWithAgri,
          staminaRestored: quest.staminaCost,
          tokensMinted,
          postDopaminePool,
          dopamineExpFed,
          ...(dopamineDrained > 0 ? { dopamineDrained } : {}),
          ...(moraleLostForRevert > 0 ? { moraleLost: moraleLostForRevert } : {}),
          ...(healthLostForRevert > 0 ? { healthLost: healthLostForRevert } : {}),
        };
      },
      completeQuestWithSopOptimize: (questId) => {
        get().syncActiveQuestPauseIfExhausted();
        const { activeCityId, quests, activeTimer } = get();
        if (!activeTimer || activeTimer.questId !== questId) return false;
        const quest = quests.find((q) => q.id === questId);
        if (!quest || !activeCityId) return false;
        const map = useMapStore.getState();
        const city = map.cities.find((c) => c.id === activeCityId);
        if (!city) return false;

        const max = Math.max(1, Math.min(99, quest.maxCompletionsPerDay ?? 1));
        const count = getQuestDailyCount(city, questId);
        if (count >= max) {
          set({ activeTimer: null });
          return false;
        }

        const inc = map.incrementQuestCompletion(activeCityId, questId, max);
        if (!inc) {
          set({ activeTimer: null });
          return false;
        }

        const emperor = useEmperorStore.getState();
        const { meritWithAgri, baseMerit } = computeQuestMeritForCity(
          quest,
          activeCityId
        );
        emperor.addExp(meritWithAgri);

        const sopE = Math.max(0, Math.floor(quest.expReward * 2));
        const dop = emperor.feedDopamineFromQuestReward(sopE);

        emitIndustrialProgressForQuest(quest, activeCityId, baseMerit);

        const sopNow = Date.now();
        const sopMs = getQuestTimerEffectiveElapsedMs(activeTimer, sopNow);
        const sopStandard = Math.max(
          1,
          Math.floor(quest.minCompletionTime ?? 10)
        );
        void recordWorkOp(activeTimer.clientSessionId, "sop_complete", {
          status: "completed",
          effectiveDurationMs: sopMs,
          effectiveDurationMinutes:
            Math.round((sopMs / 60_000) * 100) / 100,
          standardMinutes: sopStandard,
        });

        set({ activeTimer: null });
        useEmperorStore.getState().pulseDopaminePool("gain");

        return {
          expGain: meritWithAgri,
          staminaRestored: quest.staminaCost,
          tokensMinted: dop.tokensMinted,
          postDopaminePool: dop.postDopaminePool,
          dopamineExpFed: dop.dopamineExpFed,
        };
      },
      resetDailyQuests: () => {
        const today = todayKey();
        const { lastLoginDate, quests, activeTimer } = get();
        if (lastLoginDate === today) return;
        if (activeTimer) {
          const qq = quests.find((q) => q.id === activeTimer.questId);
          if (qq) useEmperorStore.getState().addStamina(qq.staminaCost);
        }
        const batch = get().activeBatchCampaign;
        if (batch) {
          const qq = quests.find((q) => q.id === batch.questId);
          if (qq) {
            useEmperorStore
              .getState()
              .addStamina(qq.staminaCost * batch.cityIds.length);
          }
        }
        const oneTimeIds = new Set(
          quests.filter((q) => q.occurrence === "one_time").map((q) => q.id)
        );
        const citiesBefore = useMapStore.getState().cities;
        const tribute = totalVassalDailyTribute(citiesBefore);
        useMapStore.setState((s) => ({
          cities: s.cities.map((c) => {
            const nextDaily: Record<string, number> = {};
            const nextAt: Record<string, number> = {};
            for (const qid of Array.from(oneTimeIds)) {
              const n = getQuestDailyCount(c, qid);
              if (n > 0) {
                nextDaily[qid] = n;
                const t = c.questCompletedAt?.[qid];
                nextAt[qid] =
                  typeof t === "number" && Number.isFinite(t) ? t : 0;
              }
            }
            const completedQuestIds = Object.keys(nextDaily).filter(
              (k) => (nextDaily[k] ?? 0) > 0
            );
            return {
              ...c,
              questDailyCompletions: nextDaily,
              questCompletedAt: nextAt,
              completedQuestIds,
            };
          }),
        }));
        set({
          quests: quests.map((q) => ({ ...q, completed: false })),
          lastLoginDate: today,
          activeTimer: null,
          activeBatchCampaign: null,
        });
        if (tribute > 0) {
          useEmperorStore.getState().injectGold(tribute, { silent: true });
          useEventStore.getState().addLog(
            `【户部】万国来朝，藩属进献岁币共计 ${formatTaels(tribute)} 两，已入国库。`,
            "treasury",
            { emphasis: "goldFlash" }
          );
        }
      },
      ensureQuestBootstrap: () => {
        useMapStore.getState().ensureTongwuSiCity();
        const { quests, activeCityId } = get();
        const cities = useMapStore.getState().cities;
        if (quests.length > 0) {
          useMapStore
            .getState()
            .pruneQuestProgressForUnknownIds(new Set(quests.map((q) => q.id)));
        }
        if (activeCityId && !cities.some((c) => c.id === activeCityId)) {
          set({ activeCityId: null });
        }
      },
      ensureMvaQuestCatalog: () => {
        get().ensureQuestBootstrap();
      },
      bulkAddQuests: (text, affiliation = "city") => {
        const { items, errors } = parseBulkQuestText(text);
        const s = get();
        const n = items.length;
        if (n === 0) return { added: 0, errors };
        let mutable = [...s.quests];
        const newQuests: Quest[] = [];
        for (let i = 0; i < n; i++) {
          const d = items[i]!;
          const period = d.period;
          const inP = mutable.filter((q) => q.period === period);
          const minSo =
            inP.length === 0 ? 0 : Math.min(...inP.map((q) => q.sortOrder ?? 0));
          const sortOrder = minSo - (n - i);
          const q: Quest = {
            id: newQuestId(),
            period,
            title: d.title,
            completed: false,
            expReward: d.expReward,
            staminaCost: d.staminaCost,
            minCompletionTime: d.minCompletionTime ?? 10,
            compensationType: d.compensationType ?? "compensable",
            occurrence: d.occurrence ?? "daily_once",
            sortOrder,
            maxCompletionsPerDay: maxFromOccurrence(d.occurrence ?? "daily_once"),
            category: getQuestCategory({
              id: `quest-bulk-${period}-${sortOrder}`,
              title: d.title,
            }),
            affiliation: normalizeQuestAffiliation(affiliation),
          };
          mutable.push(q);
          newQuests.push(q);
        }
        set({ quests: mutable });
        return { added: newQuests.length, errors };
      },
      bulkRemoveQuests: (ids) => {
        const idSet = new Set(
          ids.filter((id) => typeof id === "string" && id.length > 0)
        );
        if (idSet.size === 0) return;
        const t = get().activeTimer;
        if (t && idSet.has(t.questId)) {
          const q = get().quests.find((x) => x.id === t.questId);
          if (q) useEmperorStore.getState().addStamina(q.staminaCost);
        }
        set((s) => ({
          quests: s.quests.filter((q) => !idSet.has(q.id)),
          activeTimer:
            t && idSet.has(t.questId) ? null : s.activeTimer,
        }));
      },
      setActiveCityId: (id) => {
        if (get().activeTimer || get().activeBatchCampaign) return false;
        const cities = useMapStore.getState().cities;
        if (id != null && !cities.some((c) => c.id === id)) return false;
        set({ activeCityId: id });
        return true;
      },
      startBatchCampaignQuest: (questId, cityIds) => {
        const { quests, activeTimer, activeBatchCampaign } = get();
        if (activeTimer || activeBatchCampaign) {
          return { ok: false, reason: "尚有政务或集群战役计时未呈报。" };
        }
        const quest = quests.find((q) => q.id === questId);
        if (!quest) return { ok: false, reason: "未找到该战役任务。" };
        const cities = useMapStore.getState().cities;
        const { eligibleCityIds, skippedCityIds, totalStaminaCost } =
          resolveBatchCampaignEligibility(quest, cityIds, cities);
        if (eligibleCityIds.length === 0) {
          return {
            ok: false,
            reason:
              skippedCityIds.length > 0
                ? "所选城池该任务均已办满或不可再勘合。"
                : "请至少勾选一座可参战的征战目标。",
          };
        }
        const emperor = useEmperorStore.getState();
        if (emperor.stamina < totalStaminaCost) {
          return { ok: false, reason: "体力不足，无法发动集群点卯。" };
        }
        emperor.consumeStamina(totalStaminaCost);
        const { T_standard, T_floor } = computeBatchCampaignTimerThresholds(
          quest,
          eligibleCityIds.length
        );
        const clientSessionId = newWorkSessionId();
        void recordBatchTimerStart({
          clientSessionId,
          quest,
          cityIds: eligibleCityIds,
        });
        set({
          activeBatchCampaign: {
            questId,
            cityIds: eligibleCityIds,
            startTime: Date.now(),
            pausedMs: 0,
            pauseStartedAt: null,
            clientSessionId,
          },
        });
        return {
          ok: true,
          participantCount: eligibleCityIds.length,
          skippedCount: skippedCityIds.length,
          T_standard,
          T_floor,
        };
      },
      syncActiveBatchCampaignPauseIfExhausted: () => {
        set((s) => {
          const t = s.activeBatchCampaign;
          if (!t?.pauseStartedAt) return s;
          const now = Date.now();
          const pausedCommitted = clampPauseCommitted(t.pausedMs);
          const seg = now - t.pauseStartedAt;
          const cap = Math.max(0, QUEST_TIMER_MAX_PAUSE_MS - pausedCommitted);
          if (seg < cap) return s;
          return {
            activeBatchCampaign: {
              ...t,
              pausedMs: pausedCommitted + cap,
              pauseStartedAt: null,
            },
          };
        });
      },
      toggleBatchCampaignTimerPause: (questId) => {
        const t = get().activeBatchCampaign;
        if (!t || t.questId !== questId) return false;
        const now = Date.now();
        const pausedCommitted = clampPauseCommitted(t.pausedMs);
        if (t.pauseStartedAt != null) {
          const seg = now - t.pauseStartedAt;
          const cap = Math.max(0, QUEST_TIMER_MAX_PAUSE_MS - pausedCommitted);
          const add = Math.min(Math.max(0, seg), cap);
          void recordWorkOp(t.clientSessionId, "timer_resume");
          set({
            activeBatchCampaign: {
              ...t,
              pausedMs: pausedCommitted + add,
              pauseStartedAt: null,
            },
          });
          return true;
        }
        if (pausedCommitted >= QUEST_TIMER_MAX_PAUSE_MS) return false;
        void recordWorkOp(t.clientSessionId, "timer_pause");
        set({ activeBatchCampaign: { ...t, pauseStartedAt: now } });
        return true;
      },
      cancelBatchCampaignTimer: (questId) => {
        const t = get().activeBatchCampaign;
        if (!t || t.questId !== questId) return false;
        const q = get().quests.find((x) => x.id === questId);
        if (q) {
          useEmperorStore
            .getState()
            .addStamina(q.staminaCost * t.cityIds.length);
        }
        void recordWorkOp(t.clientSessionId, "batch_cancel", {
          staminaRefunded: (q?.staminaCost ?? 0) * t.cityIds.length,
          status: "cancelled",
        });
        set({ activeBatchCampaign: null });
        return true;
      },
      completeBatchCampaignWithTimer: (questId) => {
        get().syncActiveBatchCampaignPauseIfExhausted();
        const { quests, activeBatchCampaign } = get();
        if (!activeBatchCampaign || activeBatchCampaign.questId !== questId) {
          return false;
        }
        const quest = quests.find((q) => q.id === questId);
        if (!quest) return false;

        const now = Date.now();
        const T_actual =
          getQuestTimerEffectiveElapsedMs(activeBatchCampaign, now) / 60_000;
        const { T_standard, T_floor } = computeBatchCampaignTimerThresholds(
          quest,
          activeBatchCampaign.cityIds.length
        );

        if (T_actual < T_floor) {
          const voidMs = getQuestTimerEffectiveElapsedMs(
            activeBatchCampaign,
            now
          );
          void recordWorkOp(activeBatchCampaign.clientSessionId, "shoddy_void", {
            status: "voided",
            effectiveDurationMs: voidMs,
            effectiveDurationMinutes:
              Math.round((voidMs / 60_000) * 100) / 100,
            standardMinutes: T_standard,
          });
          useEmperorStore
            .getState()
            .addStamina(quest.staminaCost * activeBatchCampaign.cityIds.length);
          set({ activeBatchCampaign: null });
          return { shoddy: true };
        }

        const map = useMapStore.getState();
        const emperor = useEmperorStore.getState();
        let totalMerit = 0;
        let citiesCompleted = 0;
        const completedCityIds: string[] = [];

        for (const cityId of activeBatchCampaign.cityIds) {
          const city = map.cities.find((c) => c.id === cityId);
          if (!city) continue;
          const max = Math.max(1, Math.min(99, quest.maxCompletionsPerDay ?? 1));
          const inc = map.incrementQuestCompletion(cityId, questId, max);
          if (!inc) continue;
          const { meritWithAgri, baseMerit } = computeQuestMeritForCity(
            quest,
            cityId
          );
          emperor.addExp(meritWithAgri);
          totalMerit += meritWithAgri;
          citiesCompleted += 1;
          completedCityIds.push(cityId);
          emitIndustrialProgressForQuest(quest, cityId, baseMerit);
          const { message, cityName } = buildCourtDispatchDecree(quest, city);
          useEventStore.getState().addLog(message, "decree", { cityName });
        }

        if (citiesCompleted === 0) {
          set({ activeBatchCampaign: null });
          return false;
        }

        const dMain = emperor.feedDopamineFromQuestReward(totalMerit);
        let tokensMinted = dMain.tokensMinted;
        let dopamineExpFed = dMain.dopamineExpFed;
        let postDopaminePool = dMain.postDopaminePool;
        let dopamineDrained = 0;
        let moraleLostForRevert = 0;
        let healthLostForRevert = 0;

        if (T_floor <= T_actual && T_actual < T_standard) {
          const diff = T_standard - T_actual;
          const bonusE = Math.max(0, Math.floor(diff));
          if (bonusE > 0) {
            const d2 = emperor.feedDopamineFromQuestReward(bonusE);
            tokensMinted += d2.tokensMinted;
            dopamineExpFed += d2.dopamineExpFed;
            postDopaminePool = d2.postDopaminePool;
            useEventStore.getState().addLog(
              `【内务府】集团军神速合围，多巴胺能量额外凝聚 ${bonusE.toLocaleString("zh-CN")} 点。`,
              "decree",
              { emphasis: "goldFlash" }
            );
          }
        } else if (T_actual > T_standard) {
          const overTime = Math.max(0, Math.floor(T_actual - T_standard));
          if (overTime > 0) {
            const pen = emperor.applyQuestTimerOvertimePenalty({
              overTimeMinutes: overTime,
              compensationType: quest.compensationType,
            });
            postDopaminePool = pen.postDopaminePool;
            dopamineDrained = pen.dopamineDrained;
            moraleLostForRevert = pen.moraleLost;
            healthLostForRevert = pen.healthLost;
            if (pen.dopamineDrained > 0) {
              useEventStore.getState().addLog(
                `【太医院】集群战役迁延，心力损耗，多巴胺能量溢出 ${pen.dopamineDrained.toLocaleString("zh-CN")} 点。`,
                "battle"
              );
            }
            if (pen.overflow > 0) {
              useEventStore.getState().addLog(
                "【宗人府】集群战役迁延日久，蓄池枯竭，已致民心动摇。",
                "battle",
                { emphasis: "calamity" }
              );
            }
          }
        }

        if (T_actual > T_standard) {
          emperor.pulseDopaminePool("drain");
        } else {
          emperor.pulseDopaminePool("gain");
        }

        if (
          getQuestCampaignPhase(quest) === "ON_ORDER" &&
          isOpenLearningSystemQuest(quest.title)
        ) {
          for (const cityId of completedCityIds) {
            const city = map.cities.find((c) => c.id === cityId);
            const label = city ? cityDisplayName(city) : "该城";
            useEventStore.getState().addLog(
              `【工部告急】${label} 虽已破城，但粮草空虚，请速执行【转运粮草】任务包，前去下载并上传课程！`,
              "decree",
              { emphasis: "crimsonDecree", cityName: label }
            );
          }
        }

        useEventStore.getState().addLog(
          `【集团军】集群点卯《${quest.title.replace(/^【[^】]+】\s*/, "").slice(0, 20)}》已覆盖 ${citiesCompleted} 座城池，功勋合计 +${totalMerit}。`,
          "decree",
          { emphasis: "goldFlash" }
        );

        const batchEffMs = getQuestTimerEffectiveElapsedMs(
          activeBatchCampaign,
          now
        );
        void recordWorkOp(
          activeBatchCampaign.clientSessionId,
          "batch_complete",
          {
            status: "completed",
            effectiveDurationMs: batchEffMs,
            effectiveDurationMinutes:
              Math.round((batchEffMs / 60_000) * 100) / 100,
            standardMinutes: T_standard,
            citiesCompleted,
          }
        );

        set({ activeBatchCampaign: null });

        return {
          expGain: totalMerit,
          staminaRestored: quest.staminaCost * citiesCompleted,
          tokensMinted,
          postDopaminePool,
          dopamineExpFed,
          citiesCompleted,
          citiesSkipped:
            activeBatchCampaign.cityIds.length - citiesCompleted,
          totalMerit,
          T_actual,
          T_standard,
          ...(dopamineDrained > 0 ? { dopamineDrained } : {}),
          ...(moraleLostForRevert > 0 ? { moraleLost: moraleLostForRevert } : {}),
          ...(healthLostForRevert > 0 ? { healthLost: healthLostForRevert } : {}),
        };
      },
      reorderQuestsInPeriod: (period, orderedIds) =>
        set((s) => {
          const idSet = new Set(orderedIds);
          const otherPeriods = s.quests.filter((q) => q.period !== period);
          const reindexed: Quest[] = [];
          orderedIds.forEach((qid, idx) => {
            const q = s.quests.find((x) => x.id === qid && x.period === period);
            if (q) reindexed.push({ ...q, period, sortOrder: idx * 10 });
          });
          const restSame = s.quests.filter(
            (q) => q.period === period && !idSet.has(q.id)
          );
          let tail = orderedIds.length * 10;
          const restIndexed = restSame.map((q) => {
            tail += 10;
            return { ...q, sortOrder: tail };
          });
          return { quests: [...otherPeriods, ...reindexed, ...restIndexed] };
        }),
      reorderCampaignPhaseQuests: (phase, orderedIds) =>
        set((s) => {
          const base = CAMPAIGN_PHASE_SORT_BASE[phase];
          const orderMap = new Map(
            orderedIds.map((id, idx) => [id, base + idx * 10])
          );
          return {
            quests: s.quests.map((q) => {
              const next = orderMap.get(q.id);
              if (next === undefined) return q;
              if (getQuestCampaignPhase(q) !== phase) return q;
              return { ...q, sortOrder: next };
            }),
          };
        }),
    }),
    {
      name: "hanling-quest",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        quests: s.quests,
        lastLoginDate: s.lastLoginDate,
        activeCityId: s.activeCityId,
        activeTimer: s.activeTimer,
        activeBatchCampaign: s.activeBatchCampaign,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<QuestState> | undefined;
        if (!p || !Array.isArray(p.quests)) {
          return {
            ...current,
            quests: [],
            lastLoginDate:
              typeof p?.lastLoginDate === "string" ? p.lastLoginDate : "",
            activeCityId:
              p?.activeCityId === null || typeof p?.activeCityId === "string"
                ? p?.activeCityId ?? null
                : current.activeCityId,
            activeTimer:
              p && "activeTimer" in p
                ? parseActiveTimer(p.activeTimer)
                : current.activeTimer,
            activeBatchCampaign:
              p && "activeBatchCampaign" in p
                ? parseActiveBatchCampaign(p.activeBatchCampaign)
                : current.activeBatchCampaign,
          };
        }
        const migrated = p.quests.map((q) => migrateQuest(q));
        const quests = hydrateQuestSortOrderFromPersistOrder(migrated, p.quests);
        return {
          ...current,
          quests,
          lastLoginDate:
            typeof p.lastLoginDate === "string"
              ? p.lastLoginDate
              : current.lastLoginDate,
          activeCityId:
            p.activeCityId === null || typeof p.activeCityId === "string"
              ? p.activeCityId
              : current.activeCityId,
          activeTimer:
            p && "activeTimer" in p
              ? parseActiveTimer(p.activeTimer)
              : current.activeTimer,
          activeBatchCampaign:
            p && "activeBatchCampaign" in p
              ? parseActiveBatchCampaign(p.activeBatchCampaign)
              : current.activeBatchCampaign,
        };
      },
    }
  )
);
