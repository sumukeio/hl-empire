import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { todayKey } from "@/lib/today-key";
import { parseBulkQuestText } from "@/lib/parse-bulk-quest-lines";

import { useEmperorStore } from "./emperor-store";
import { useMapStore } from "./map-store";
import type { Quest, QuestPatch, QuestPeriod } from "./types";

const PERIODS_ALL: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

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

/** 首次安装或无可读存档时的默认军机任务（祖宗之法 · MVA；可在造办处增删改）。 */
export function createDefaultQuests(): Quest[] {
  const rows: Array<
    Pick<Quest, "period" | "title" | "expReward" | "staminaCost"> & {
      slot: string;
    }
  > = [
    // 早朝 08:00~11:30
    {
      period: "早朝",
      slot: "1",
      title:
        "【户部】查阅国库：查验昨日竞价消耗与转化",
      expReward: 10,
      staminaCost: 5,
    },
    {
      period: "早朝",
      slot: "2",
      title:
        "【刑部】查杀贪官：下载搜索词报告，精确否定垃圾词",
      expReward: 20,
      staminaCost: 10,
    },
    {
      period: "早朝",
      slot: "3",
      title:
        "【兵部】招募壮丁：根据出单词与搜索词进行系统拓词",
      expReward: 15,
      staminaCost: 10,
    },
    {
      period: "早朝",
      slot: "4",
      title:
        "【工部】组建军团：导词粗分，配置出价，将新兵编入军团",
      expReward: 15,
      staminaCost: 10,
    },
    // 晌午 11:50~17:30
    {
      period: "晌午",
      slot: "1",
      title:
        "【兵部】侦查敌国：扒取同行落地页、小红书素材与朋友圈",
      expReward: 15,
      staminaCost: 10,
    },
    {
      period: "晌午",
      slot: "2",
      title:
        "【礼部】安插间谍：添加同行微信，套取话术与底价情报",
      expReward: 15,
      staminaCost: 10,
    },
    {
      period: "晌午",
      slot: "3",
      title:
        "【工部】打造军械：利用 AI 批量洗稿生成创意与高级样式",
      expReward: 20,
      staminaCost: 15,
    },
    // 傍晚 18:00~20:30
    {
      period: "傍晚",
      slot: "1",
      title:
        "【外交】藩属安抚：跟进 K 级客户，发放服务确认与索要举荐",
      expReward: 10,
      staminaCost: 5,
    },
    {
      period: "傍晚",
      slot: "2",
      title:
        "【外交】下达通牒：向 L 级客户下发系统锁死最后通牒逼单",
      expReward: 15,
      staminaCost: 5,
    },
    {
      period: "傍晚",
      slot: "3",
      title:
        "【外交】缔结同盟：向 Z 级客户投喂实拍案例与证书展示",
      expReward: 10,
      staminaCost: 5,
    },
    {
      period: "傍晚",
      slot: "4",
      title:
        "【内务】系统清理：向 B/ZB 级死粉下发最后清理警告并归档",
      expReward: 10,
      staminaCost: 5,
    },
    // 深夜 20:30~23:30
    {
      period: "深夜",
      slot: "1",
      title:
        "【兵部】点火出征：将新备军械（创意图/问答）上传至竞价后台",
      expReward: 20,
      staminaCost: 15,
    },
    {
      period: "深夜",
      slot: "2",
      title:
        "【工部】皇城基建：上传云点播课程及考试系统题库配置",
      expReward: 20,
      staminaCost: 15,
    },
    {
      period: "深夜",
      slot: "3",
      title:
        "【太医院】停机复盘：提取死单截图，生成复盘奏折呈交 AI 导师",
      expReward: 25,
      staminaCost: 10,
    },
  ];

  return rows.map((r) => ({
    id: `quest-mva-${r.period}-${r.slot}`,
    period: r.period,
    title: r.title,
    completed: false,
    expReward: r.expReward,
    staminaCost: r.staminaCost,
  }));
}

export function createEmptyQuest(
  partial?: Partial<Omit<Quest, "id" | "completed">>
): Quest {
  const period =
    partial?.period && PERIODS_ALL.includes(partial.period)
      ? partial.period
      : "早朝";
  return {
    id: newQuestId(),
    period,
    title: partial?.title ?? "新军机",
    completed: false,
    expReward:
      typeof partial?.expReward === "number" && partial.expReward >= 0
        ? partial.expReward
        : 10,
    staminaCost:
      typeof partial?.staminaCost === "number" && partial.staminaCost >= 0
        ? partial.staminaCost
        : 5,
  };
}

function normalizePeriod(p: unknown): QuestPeriod {
  if (typeof p === "string" && PERIODS_ALL.includes(p as QuestPeriod)) {
    return p as QuestPeriod;
  }
  return "早朝";
}

export function migrateQuest(raw: unknown): Quest {
  const r = raw as Record<string, unknown>;
  return {
    id: typeof r.id === "string" ? r.id : newQuestId(),
    period: normalizePeriod(r.period),
    title: typeof r.title === "string" ? r.title : "未命名任务",
    completed: r.completed === true,
    expReward:
      typeof r.expReward === "number" && Number.isFinite(r.expReward)
        ? Math.max(0, r.expReward)
        : 0,
    staminaCost:
      typeof r.staminaCost === "number" && Number.isFinite(r.staminaCost)
        ? Math.max(0, r.staminaCost)
        : 0,
  };
}

export interface QuestState {
  quests: Quest[];
  lastLoginDate: string;
  /** 军机处当前主攻城池；勘合写入该城 `completedQuestIds`。 */
  activeCityId: string | null;
}

export interface QuestActions {
  addQuest: (quest: Quest) => void;
  removeQuest: (id: string) => void;
  updateQuest: (id: string, data: QuestPatch) => void;
  toggleQuest: (questId: string) => boolean;
  resetDailyQuests: () => void;
  /**
   * 保证「祖宗之法」MVA 任务集存在：
   * - 无存档 / 空列表 → 写入完整默认表；
   * - 仍含旧版 bundled id（`quest-default-*`）→ 整表替换为新版 `quest-mva-*`；
   * - 已有部分 `quest-mva-*` → 仅补全缺失 id（不删用户自建条目）。
   */
  ensureMvaQuestCatalog: () => void;
  /** 多行文本批量追加政务；返回新增条数与解析错误（行号+说明）。 */
  bulkAddQuests: (text: string) => BulkAddQuestsResult;
  bulkRemoveQuests: (ids: string[]) => void;
  setActiveCityId: (id: string | null) => void;
}

export const useQuestStore = create<QuestState & QuestActions>()(
  persist(
    (set, get) => ({
      quests: [],
      lastLoginDate: "",
      activeCityId: null,
      addQuest: (quest) =>
        set((s) => ({
          quests: [...s.quests, { ...quest, id: quest.id || newQuestId() }],
        })),
      removeQuest: (id) =>
        set((s) => ({
          quests: s.quests.filter((q) => q.id !== id),
        })),
      updateQuest: (id, data) =>
        set((s) => ({
          quests: s.quests.map((q) => {
            if (q.id !== id) return q;
            const next = { ...q, ...data, id: q.id };
            next.period = normalizePeriod(next.period);
            return next;
          }),
        })),
      toggleQuest: (questId) => {
        const { activeCityId, quests } = get();
        if (!activeCityId) return false;
        const quest = quests.find((q) => q.id === questId);
        if (!quest) return false;
        const city = useMapStore
          .getState()
          .cities.find((c) => c.id === activeCityId);
        if (!city) return false;

        const isDone = city.completedQuestIds.includes(questId);
        if (!isDone) {
          const emperor = useEmperorStore.getState();
          if (emperor.stamina < quest.staminaCost) return false;
          emperor.consumeStamina(quest.staminaCost);
          /** 移动行宫：仅对内置 MVA 模板任务（quest-mva-*）功勋 +20% */
          const mvaBonus =
            emperor.isNomadMode && quest.id.startsWith("quest-mva-");
          const expGain = mvaBonus
            ? Math.round(quest.expReward * 1.2)
            : quest.expReward;
          emperor.addExp(expGain);
        }

        useMapStore.getState().toggleCityQuest(activeCityId, questId);

        if (!isDone) {
          useEmperorStore.getState().addTokens(1);
        }
        return true;
      },
      resetDailyQuests: () => {
        const today = todayKey();
        const { lastLoginDate } = get();
        if (lastLoginDate === today) return;
        useMapStore.setState((s) => ({
          cities: s.cities.map((c) => ({
            ...c,
            completedQuestIds: [],
            questCompletedAt: {},
          })),
        }));
        set({
          quests: get().quests.map((q) => ({ ...q, completed: false })),
          lastLoginDate: today,
        });
      },
      ensureMvaQuestCatalog: () => {
        set((s) => {
          const quests = s.quests;
          if (quests.length === 0) {
            return { quests: createDefaultQuests() };
          }
          const hasLegacyBundled = quests.some((q) =>
            q.id.startsWith("quest-default-")
          );
          if (hasLegacyBundled) {
            return { quests: createDefaultQuests() };
          }
          const defaults = createDefaultQuests();
          const have = new Set(quests.map((q) => q.id));
          const missing = defaults.filter((d) => !have.has(d.id));
          if (missing.length === 0) return {};
          return { quests: [...quests, ...missing] };
        });
      },
      bulkAddQuests: (text) => {
        const { items, errors } = parseBulkQuestText(text);
        const newQuests: Quest[] = items.map((d) =>
          createEmptyQuest({
            title: d.title,
            period: d.period,
            expReward: d.expReward,
            staminaCost: d.staminaCost,
          })
        );
        if (newQuests.length > 0) {
          set((s) => ({ quests: [...s.quests, ...newQuests] }));
        }
        return { added: newQuests.length, errors };
      },
      bulkRemoveQuests: (ids) => {
        const idSet = new Set(
          ids.filter((id) => typeof id === "string" && id.length > 0)
        );
        if (idSet.size === 0) return;
        set((s) => ({
          quests: s.quests.filter((q) => !idSet.has(q.id)),
        }));
      },
      setActiveCityId: (id) => set({ activeCityId: id }),
    }),
    {
      name: "hanling-quest",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        quests: s.quests,
        lastLoginDate: s.lastLoginDate,
        activeCityId: s.activeCityId,
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
          };
        }
        return {
          ...current,
          quests: p.quests.map((q) => migrateQuest(q)),
          lastLoginDate:
            typeof p.lastLoginDate === "string"
              ? p.lastLoginDate
              : current.lastLoginDate,
          activeCityId:
            p.activeCityId === null || typeof p.activeCityId === "string"
              ? p.activeCityId
              : current.activeCityId,
        };
      },
    }
  )
);
