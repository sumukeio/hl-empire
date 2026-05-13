import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { buildEmperorTitlePromotionMessage } from "@/lib/emperor-title";

import { useEventStore } from "./event-store";

const EXP_PER_LEVEL = 100;

const ENTERTAINMENT_MS = 20 * 60 * 1000;

function computeLevelFromExp(totalExp: number): number {
  return Math.max(1, Math.floor(totalExp / EXP_PER_LEVEL) + 1);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function emitEmperorTitleTierPromotion(prevExp: number, nextExp: number) {
  const msg = buildEmperorTitlePromotionMessage(prevExp, nextExp);
  if (!msg) return;
  useEventStore.getState().addLog(msg, "decree", {
    emphasis: "crimsonDecree",
  });
}

export interface EmperorState {
  level: number;
  exp: number;
  stamina: number;
  gold: number;
  troops: number;
  /** 龙体 0–100 */
  health: number;
  /** 武术 / 执行力（默认 10） */
  martialArts: number;
  /** 翻牌券（完成军机任务发放） */
  tokens: number;
  /** 宣政殿 true = 已着朝服，可操作；养心殿 false = 睡衣，沙盘遮罩 */
  isDressed: boolean;
  /** 娱乐倒计时进行中 */
  isEntertaining: boolean;
  /** 本轮娱乐结束时间戳（ms），用于持久化与刷新恢复 */
  entertainmentDeadline: number | null;
  /** 开启本轮时 health < 50，结束时额外扣 5 点健康 */
  entertainmentLowHealthPenalty: boolean;
  /** 太医院：连续抗炎饮食「连击」计数（每次御膳房 +1，毒丹清零；非自然日也可理解为习惯 streak） */
  healthCombo: number;
  /** 民心 0–100 */
  morale: number;
  /** 皇室私库 / 旅行基金 */
  privateVault: number;
  /** 文学修养（理藩院人文线，默认 10） */
  literature: number;
  /** 移动行宫：在酒店/咖啡馆办公；开启时 MVA 军机功勋 +20%（见 quest-store） */
  isNomadMode: boolean;
}

export interface EmperorActions {
  addExp: (amount: number) => void;
  consumeStamina: (amount: number) => void;
  updateGold: (gold: number | ((prev: number) => number)) => void;
  /** 内务府：登记工资/补贴等非业务岁入 */
  injectGold: (amount: number) => void;
  /** 户部：手动将国库校准为实存现金 */
  syncGold: (total: number) => void;
  updateTroops: (troops: number | ((prev: number) => number)) => void;
  dailyReset: () => void;
  addTokens: (amount: number) => void;
  setHealth: (value: number | ((prev: number) => number)) => void;
  setIsDressed: (value: boolean) => void;
  /** 前往养心殿安寝：恢复健康与体力，结束娱乐态 */
  sleepAtYangxinPalace: () => void;
  /** 丛林围猎 */
  jungleHunt: () => boolean;
  /** 御前比武 */
  royalSparring: () => boolean;
  /** 翻牌子：消耗 1 券，开启 20 分钟娱乐 */
  startEntertainment: () => boolean;
  /** 计时结束或确认退朝：结算透支惩罚并清空娱乐态 */
  completeEntertainmentSession: () => void;
  /** 内务府 · 太医院：抗炎饮食（连击延寿丹） */
  consumeAntiInflammatory: () => void;
  /** 内务府 · 太医院：劣质饮食 */
  consumeJunkFood: () => void;
  /** 内务府 · 西殿习武（耗体力、涨武力） */
  trainMartialArts: () => void;
  /** 内务府 · 户部：工部拨款 / 骄奢淫逸 */
  recordExpense: (
    amount: number,
    type: "infrastructure" | "decadence"
  ) => boolean;
  /** 内务府 · 户部：副业利润转入私库 */
  transferToPrivateVault: (amount: number) => boolean;
  /** 内务府 · 理藩院：国子监/太庙（私库≥500） */
  visitImperialArchives: () => boolean;
  /** 内务府 · 理藩院：网红打卡（私库−1000） */
  indulgeCommercialTourism: () => boolean;
  /** 内务府 · 理藩院：移动行宫模式 */
  setNomadMode: (value: boolean) => void;
  /** 内务府 · 宗人府：闭关锁国 */
  rejectInvalidSocial: () => void;
  /** 内务府 · 宗人府：召见内阁（耗体力、涨功勋） */
  meetGrandSecretariat: () => boolean;
  /** 内务府 · 宗人府：祸国妖姬（私库腰斩、民心大损） */
  acceptEntropyCompanion: () => boolean;
  /** 撤回军机勘合：恢复体力、扣回功勋、扣回翻牌券（与邸报 revert 配套） */
  revertQuestCompletionEffects: (args: {
    staminaRestored: number;
    expSubtracted: number;
    tokensSubtracted: number;
  }) => void;
}

const defaultState: EmperorState = {
  level: 1,
  exp: 0,
  stamina: 100,
  gold: 0,
  troops: 0,
  health: 100,
  martialArts: 10,
  tokens: 0,
  isDressed: true,
  isEntertaining: false,
  entertainmentDeadline: null,
  entertainmentLowHealthPenalty: false,
  healthCombo: 0,
  morale: 100,
  privateVault: 0,
  literature: 10,
  isNomadMode: false,
};

export const useEmperorStore = create<EmperorState & EmperorActions>()(
  persist(
    (set, get) => ({
      ...defaultState,
      addExp: (amount) => {
        if (amount <= 0) return;
        const prevExp = get().exp;
        set((s) => {
          const exp = s.exp + amount;
          return { exp, level: computeLevelFromExp(exp) };
        });
        emitEmperorTitleTierPromotion(prevExp, get().exp);
      },
      consumeStamina: (amount) => {
        if (amount <= 0) return;
        set((s) => ({ stamina: Math.max(0, s.stamina - amount) }));
      },
      updateGold: (updater) =>
        set((s) => ({
          gold:
            typeof updater === "function"
              ? (updater as (prev: number) => number)(s.gold)
              : updater,
        })),
      injectGold: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const n = Math.floor(amount);
        if (n <= 0) return;
        set((s) => ({ gold: s.gold + n }));
        useEventStore.getState().addLog(
          `【内务府】岁入拨入 ${n.toLocaleString("zh-CN")} 两。`,
          "treasury"
        );
      },
      syncGold: (total) => {
        if (!Number.isFinite(total)) return;
        const n = Math.max(0, Math.floor(total));
        set({ gold: n });
        useEventStore.getState().addLog(
          `【户部】国库储蓄已校准，当前存银 ${n.toLocaleString("zh-CN")} 两。`,
          "treasury"
        );
      },
      updateTroops: (updater) =>
        set((s) => ({
          troops:
            typeof updater === "function"
              ? (updater as (prev: number) => number)(s.troops)
              : updater,
        })),
      dailyReset: () => set({ stamina: 100 }),
      addTokens: (amount) => {
        if (amount <= 0) return;
        set((s) => ({ tokens: s.tokens + amount }));
      },
      setHealth: (updater) =>
        set((s) => ({
          health: clamp(
            typeof updater === "function"
              ? (updater as (prev: number) => number)(s.health)
              : updater,
            0,
            100
          ),
        })),
      setIsDressed: (value) => set({ isDressed: value }),
      sleepAtYangxinPalace: () =>
        set((s) => ({
          health: clamp(s.health + 45, 0, 100),
          stamina: 100,
          isEntertaining: false,
          entertainmentDeadline: null,
          entertainmentLowHealthPenalty: false,
        })),
      jungleHunt: () => {
        const s = get();
        if (s.health < 30 || !s.isDressed || s.isEntertaining) return false;
        if (s.stamina < 20) return false;
        const prevExp = s.exp;
        const nextExp = s.exp + 15;
        set({
          stamina: s.stamina - 20,
          exp: nextExp,
          martialArts: s.martialArts + 5,
          level: computeLevelFromExp(nextExp),
        });
        emitEmperorTitleTierPromotion(prevExp, nextExp);
        return true;
      },
      royalSparring: () => {
        const s = get();
        if (s.health < 30 || !s.isDressed || s.isEntertaining) return false;
        if (s.stamina < 15) return false;
        const prevExp = s.exp;
        const nextExp = s.exp + 10;
        set({
          stamina: s.stamina - 15,
          exp: nextExp,
          martialArts: s.martialArts + 3,
          level: computeLevelFromExp(nextExp),
        });
        emitEmperorTitleTierPromotion(prevExp, nextExp);
        return true;
      },
      startEntertainment: () => {
        const s = get();
        if (s.health < 30 || !s.isDressed) return false;
        if (s.isEntertaining) return false;
        if (s.tokens < 1) return false;
        const low = s.health < 50;
        set({
          tokens: s.tokens - 1,
          isEntertaining: true,
          entertainmentDeadline: Date.now() + ENTERTAINMENT_MS,
          entertainmentLowHealthPenalty: low,
        });
        return true;
      },
      completeEntertainmentSession: () =>
        set((s) => {
          let health = s.health;
          if (s.entertainmentLowHealthPenalty) {
            health = clamp(health - 5, 0, 100);
          }
          return {
            health,
            isEntertaining: false,
            entertainmentDeadline: null,
            entertainmentLowHealthPenalty: false,
          };
        }),
      consumeAntiInflammatory: () => {
        set((s) => {
          const healthCombo = s.healthCombo + 1;
          return {
            stamina: clamp(s.stamina + 10, 0, 100),
            health: clamp(s.health + 1, 0, 100),
            healthCombo,
          };
        });
        const comboAfter = get().healthCombo;
        const log = useEventStore.getState().addLog;
        if (comboAfter >= 3) {
          log("太医进献延寿丹，龙体大安！", "treasury", {
            emphasis: "goldFlash",
          });
        } else {
          log("服用抗炎仙丹，气血充盈。", "decree");
        }
      },
      consumeJunkFood: () => {
        set((s) => ({
          stamina: clamp(s.stamina - 30, 0, 100),
          health: clamp(s.health - 5, 0, 100),
          healthCombo: 0,
        }));
        useEventStore.getState().addLog(
          "圣上误食劣质毒丹，龙体欠安，急召太医！",
          "battle"
        );
      },
      trainMartialArts: () => {
        set((s) => ({
          stamina: clamp(s.stamina - 5, 0, 100),
          martialArts: s.martialArts + 2,
        }));
        useEventStore
          .getState()
          .addLog("圣上御花园习武，筋骨强健，武力提升！", "decree");
      },
      recordExpense: (amount, type) => {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        const cost = type === "decadence" ? amount * 2 : amount;
        const s = get();
        if (s.gold < cost) return false;
        const log = useEventStore.getState().addLog;
        if (type === "infrastructure") {
          set({ gold: s.gold - cost });
          log(
            `工部拨款 ${Math.round(amount)} 两，充实帝国基建，物尽其用。`,
            "treasury"
          );
        } else {
          set({
            gold: s.gold - cost,
            morale: clamp(s.morale - 10, 0, 100),
          });
          log(
            "朝野非议！圣上骄奢淫逸，挥霍无度，折损国库与民心！",
            "battle"
          );
        }
        return true;
      },
      transferToPrivateVault: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return false;
        const s = get();
        if (s.gold < amount) return false;
        set({
          gold: s.gold - amount,
          privateVault: s.privateVault + amount,
        });
        useEventStore.getState().addLog(
          `岁入充盈，转存 ${Math.round(amount)} 两至皇室私库，为巡游天下积蓄粮草。`,
          "treasury",
          { emphasis: "goldFlash" }
        );
        return true;
      },
      visitImperialArchives: () => {
        const s = get();
        if (s.privateVault < 500) return false;
        const prevExp = s.exp;
        const exp = s.exp + 50;
        set({
          privateVault: s.privateVault - 500,
          exp,
          literature: s.literature + 5,
          level: computeLevelFromExp(exp),
        });
        useEventStore.getState().addLog(
          "圣上巡视江南藏书楼与太庙，对话古今，龙心大悦，文学大涨！",
          "treasury",
          { emphasis: "goldFlash" }
        );
        emitEmperorTitleTierPromotion(prevExp, exp);
        return true;
      },
      indulgeCommercialTourism: () => {
        const s = get();
        if (s.privateVault < 1000) return false;
        set({ privateVault: s.privateVault - 1000 });
        useEventStore.getState().addLog(
          "圣上沉迷声色犬马之地，耗费巨资，空虚无益。",
          "battle"
        );
        return true;
      },
      setNomadMode: (value) => {
        if (get().isNomadMode === value) return;
        set({ isNomadMode: value });
        const log = useEventStore.getState().addLog;
        if (value) {
          log("圣上扎营塞外，随军处理政务，效率大增！", "decree");
        } else {
          log("圣上拔营回京。", "info");
        }
      },
      rejectInvalidSocial: () => {
        set((s) => ({
          stamina: clamp(s.stamina + 15, 0, 100),
        }));
        useEventStore.getState().addLog(
          "圣上拒见闲杂人等，驳回无理奏折，休养生息！",
          "decree"
        );
      },
      meetGrandSecretariat: () => {
        const s = get();
        if (s.stamina < 5) return false;
        const prevExp = s.exp;
        const exp = s.exp + 20;
        set({
          stamina: clamp(s.stamina - 5, 0, 100),
          exp,
          level: computeLevelFromExp(exp),
        });
        useEventStore.getState().addLog(
          "圣上召见内阁首辅与太傅，彻夜长谈，认知跃迁！",
          "decree"
        );
        emitEmperorTitleTierPromotion(prevExp, exp);
        return true;
      },
      acceptEntropyCompanion: () => {
        const s = get();
        if (s.privateVault <= 0) return false;
        const newVault = Math.floor(s.privateVault / 2);
        set({
          privateVault: newVault,
          morale: clamp(s.morale - 20, 0, 100),
        });
        useEventStore.getState().addLog(
          "妖姬惑主！后宫干政，国库严重失窃，系统面临崩溃风险！",
          "battle",
          { emphasis: "calamity" }
        );
        return true;
      },
      revertQuestCompletionEffects: ({
        staminaRestored,
        expSubtracted,
        tokensSubtracted,
      }) => {
        set((s) => {
          const stamina = clamp(s.stamina + staminaRestored, 0, 100);
          const exp = Math.max(0, s.exp - expSubtracted);
          const tokens = Math.max(0, s.tokens - tokensSubtracted);
          return {
            stamina,
            exp,
            level: computeLevelFromExp(exp),
            tokens,
          };
        });
      },
    }),
    {
      name: "hanling-emperor",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        level: s.level,
        exp: s.exp,
        stamina: s.stamina,
        gold: s.gold,
        troops: s.troops,
        health: s.health,
        martialArts: s.martialArts,
        tokens: s.tokens,
        isDressed: s.isDressed,
        isEntertaining: s.isEntertaining,
        entertainmentDeadline: s.entertainmentDeadline,
        entertainmentLowHealthPenalty: s.entertainmentLowHealthPenalty,
        healthCombo: s.healthCombo,
        morale: s.morale,
        privateVault: s.privateVault,
        literature: s.literature,
        isNomadMode: s.isNomadMode,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<EmperorState> | undefined;
        if (!p) return { ...current };
        const exp = typeof p.exp === "number" ? p.exp : current.exp;
        const stamina =
          typeof p.stamina === "number" ? p.stamina : current.stamina;
        const gold = typeof p.gold === "number" ? p.gold : current.gold;
        const troops = typeof p.troops === "number" ? p.troops : current.troops;
        const health =
          typeof p.health === "number" ? clamp(p.health, 0, 100) : current.health;
        const martialArts =
          typeof p.martialArts === "number" && Number.isFinite(p.martialArts)
            ? Math.max(0, p.martialArts)
            : 10;
        const tokens = typeof p.tokens === "number" ? p.tokens : current.tokens;
        const isDressed =
          typeof p.isDressed === "boolean" ? p.isDressed : current.isDressed;
        const isEntertaining =
          typeof p.isEntertaining === "boolean"
            ? p.isEntertaining
            : current.isEntertaining;
        const entertainmentDeadline =
          typeof p.entertainmentDeadline === "number"
            ? p.entertainmentDeadline
            : current.entertainmentDeadline;
        const entertainmentLowHealthPenalty =
          typeof p.entertainmentLowHealthPenalty === "boolean"
            ? p.entertainmentLowHealthPenalty
            : current.entertainmentLowHealthPenalty;
        const healthCombo =
          typeof p.healthCombo === "number" && Number.isFinite(p.healthCombo)
            ? Math.max(0, Math.floor(p.healthCombo))
            : current.healthCombo;
        const morale =
          typeof p.morale === "number" && Number.isFinite(p.morale)
            ? clamp(p.morale, 0, 100)
            : current.morale;
        const privateVault =
          typeof p.privateVault === "number" && Number.isFinite(p.privateVault)
            ? Math.max(0, p.privateVault)
            : current.privateVault;
        const literature =
          typeof p.literature === "number" && Number.isFinite(p.literature)
            ? Math.max(0, p.literature)
            : 10;
        const isNomadMode =
          typeof p.isNomadMode === "boolean" ? p.isNomadMode : current.isNomadMode;

        return {
          ...current,
          exp,
          stamina,
          gold,
          troops,
          health,
          martialArts,
          tokens,
          isDressed,
          isEntertaining,
          entertainmentDeadline,
          entertainmentLowHealthPenalty,
          healthCombo,
          morale,
          privateVault,
          literature,
          isNomadMode,
          level: computeLevelFromExp(exp),
        };
      },
    }
  )
);
