import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  analyzeTitlePromotionVisualFlags,
  buildEmperorTitlePromotionMessage,
  getEmperorTitleTierIndex,
} from "@/lib/emperor-title";

import { useEventStore } from "./event-store";
import type {
  CityDailyReportData,
  QuestCompensationType,
  RecordExpenseInput,
  SubmitCityReportResult,
} from "./types";

const EXP_PER_LEVEL = 100;

/** 功勋注入「多巴胺池」后，每满此值铸 1 张翻牌券（余量留在池中） */
export const DOPAMINE_ENERGY_PER_TICKET = 15;

const ENTERTAINMENT_MS = 20 * 60 * 1000;

function computeLevelFromExp(totalExp: number): number {
  return Math.max(1, Math.floor(totalExp / EXP_PER_LEVEL) + 1);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function emitEmperorTitleTierPromotion(prevExp: number, nextExp: number) {
  const prevIdx = getEmperorTitleTierIndex(prevExp);
  const nextIdx = getEmperorTitleTierIndex(nextExp);
  if (nextIdx <= prevIdx) return;
  const { goldLong, crimsonZhengCong } = analyzeTitlePromotionVisualFlags(
    prevIdx,
    nextIdx
  );
  const addLog = useEventStore.getState().addLog;
  if (goldLong) {
    addLog("【天象】紫气东来，御案金光贯顶！", "treasury", {
      emphasis: "goldFlashLong",
    });
  }
  const msg = buildEmperorTitlePromotionMessage(prevExp, nextExp);
  if (!msg) return;
  addLog(msg, "decree", {
    emphasis: crimsonZhengCong ? "crimsonDecree" : "goldFlash",
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
  /** 翻牌券（由军机功勋注入多巴胺池后凝结发放） */
  tokens: number;
  /**
   * 多巴胺能量池余量（0–14）：军机功勋仅写入此池，满 15 铸 1 券并入 `tokens`。
   */
  dopaminePool: number;
  /** 宣政殿 true = 已着朝服，可操作；养心殿 false = 睡衣，九州图志遮罩 */
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
  /** 军费余额（百度余额）；战报消耗从此扣，由国库 `allocateFunds` 拨入 */
  militaryFunds: number;
  /** 不持久化：多巴胺蓄池结算动画（流光 / 溢出） */
  dopaminePoolAnim: "none" | "gain" | "drain";
}

export interface EmperorActions {
  addExp: (amount: number) => void;
  /**
   * 军机点卯：将本次获得的功勋量注入多巴胺池，按每 15 点铸翻牌券并写邸报。
   * @returns 铸券张数、结算后池余量、实际注入量（取整后）
   */
  feedDopamineFromQuestReward: (expAmount: number) => {
    tokensMinted: number;
    postDopaminePool: number;
    dopamineExpFed: number;
  };
  /**
   * 政务超时等：从多巴胺池扣除点数（不扣翻牌券），实际扣除量受当前池量限制。
   */
  drainDopaminePoolEnergy: (amount: number) => {
    drained: number;
    postDopaminePool: number;
  };
  /** 触发内务府蓄池流光（gain）或溢出警示（drain）；不写入持久化 */
  pulseDopaminePool: (kind: "gain" | "drain") => void;
  /**
   * 御定刻漏超时：从多巴胺池扣 `overTimeMinutes` 点（可为负溢出）；
   * 蓄池不足部分记为 overflow，每 2 点溢出扣 1 民心；不可弥补类额外扣 1 健康。
   */
  applyQuestTimerOvertimePenalty: (input: {
    overTimeMinutes: number;
    compensationType: QuestCompensationType;
  }) => {
    postDopaminePool: number;
    dopamineDrained: number;
    overflow: number;
    moraleLost: number;
    healthLost: number;
  };
  consumeStamina: (amount: number) => void;
  /** 恢复体力（0–100），不改动 healthCombo */
  addStamina: (amount: number) => void;
  updateGold: (gold: number | ((prev: number) => number)) => void;
  /**
   * 奏折：城池度支(CPA) 上调，从国库按差额支用军饷（见底则实支为当前存银）。
   * 邸报：【户部】拨付军饷，【城池名】支用 [N] 两。
   */
  spendTreasuryForCityCpaIncrease: (
    cityDisplayName: string,
    cpaIncrease: number
  ) => void;
  /** 内务府：登记工资/补贴等非业务岁入；`silent` 时不写默认岁入邸报（由调用方自拟文案） */
  injectGold: (amount: number, options?: { silent?: boolean }) => void;
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
  /**
   * 内务府 · 户部：个人支用 / 资产配置。
   * 银两按入账数额 1:1 从 `gold` 扣除；按分类联动体力、文学、民心、多巴胺池并写邸报。
   */
  recordExpense: (input: RecordExpenseInput) => boolean;
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
    postDopaminePool?: number;
    dopamineExpFed?: number;
    dopamineDrained?: number;
    /** 超时溢出等扣掉的民心（撤回时加回） */
    moraleLost?: number;
    /** 不可弥补类溢出额外扣的健康（撤回时加回） */
    healthLost?: number;
  }) => void;
  /** 国库 → 军费：从 `gold` 拨入 `militaryFunds` */
  allocateFunds: (amount: number) => boolean;
  /** 城池日结战报（委托 map-store，扣军费并累加城池数据） */
  submitCityReport: (
    cityId: string,
    dailyData: CityDailyReportData
  ) => SubmitCityReportResult;
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
  dopaminePool: 0,
  isDressed: true,
  isEntertaining: false,
  entertainmentDeadline: null,
  entertainmentLowHealthPenalty: false,
  healthCombo: 0,
  morale: 100,
  privateVault: 0,
  literature: 10,
  isNomadMode: false,
  militaryFunds: 0,
  dopaminePoolAnim: "none",
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
      feedDopamineFromQuestReward: (expAmount) => {
        const E = Math.max(
          0,
          Math.min(9999, Math.floor(Number.isFinite(expAmount) ? expAmount : 0))
        );
        if (E <= 0) {
          const pool = clamp(Math.floor(get().dopaminePool), 0, 14);
          return {
            tokensMinted: 0,
            postDopaminePool: pool,
            dopamineExpFed: 0,
          };
        }
        let tokensMinted = 0;
        let postDopaminePool = 0;
        set((s) => {
          const P0 = clamp(Math.floor(s.dopaminePool), 0, 14);
          const total = P0 + E;
          tokensMinted = Math.floor(total / DOPAMINE_ENERGY_PER_TICKET);
          postDopaminePool = total % DOPAMINE_ENERGY_PER_TICKET;
          return {
            dopaminePool: postDopaminePool,
            tokens: s.tokens + tokensMinted,
          };
        });
        if (tokensMinted > 0) {
          useEventStore.getState().addLog(
            `【内务府】由于圣上勤政，多巴胺能量已凝结，获得 ${tokensMinted.toLocaleString("zh-CN")} 张翻牌券。`,
            "treasury",
            { emphasis: "goldFlash" }
          );
        }
        return {
          tokensMinted,
          postDopaminePool,
          dopamineExpFed: E,
        };
      },
      drainDopaminePoolEnergy: (amount) => {
        const want = Math.max(
          0,
          Math.floor(Number.isFinite(amount) ? (amount as number) : 0)
        );
        let drained = 0;
        let postDopaminePool = 0;
        set((s) => {
          const p0 = clamp(Math.floor(s.dopaminePool), 0, 14);
          drained = Math.min(want, p0);
          postDopaminePool = p0 - drained;
          return { dopaminePool: postDopaminePool };
        });
        return { drained, postDopaminePool };
      },
      pulseDopaminePool: (kind) => {
        set({ dopaminePoolAnim: kind });
      },
      applyQuestTimerOvertimePenalty: ({ overTimeMinutes, compensationType }) => {
        const over = Math.max(
          0,
          Math.floor(
            Number.isFinite(overTimeMinutes) ? (overTimeMinutes as number) : 0
          )
        );
        if (over <= 0) {
          const pool = clamp(Math.floor(get().dopaminePool), 0, 14);
          return {
            postDopaminePool: pool,
            dopamineDrained: 0,
            overflow: 0,
            moraleLost: 0,
            healthLost: 0,
          };
        }
        let dopamineDrained = 0;
        let postDopaminePool = 0;
        let overflow = 0;
        let moraleLost = 0;
        let healthLost = 0;
        set((s) => {
          const P = clamp(Math.floor(s.dopaminePool), 0, 14);
          const newPool = P - over;
          if (newPool >= 0) {
            postDopaminePool = newPool;
            dopamineDrained = over;
          } else {
            overflow = Math.abs(newPool);
            postDopaminePool = 0;
            dopamineDrained = P;
            moraleLost = Math.floor(overflow / 2);
            healthLost = compensationType === "absolute" ? 1 : 0;
          }
          return {
            dopaminePool: postDopaminePool,
            morale: clamp(s.morale - moraleLost, 0, 100),
            health: clamp(s.health - healthLost, 0, 100),
          };
        });
        const snap = get();
        return {
          postDopaminePool: clamp(Math.floor(snap.dopaminePool), 0, 14),
          dopamineDrained,
          overflow,
          moraleLost,
          healthLost,
        };
      },
      consumeStamina: (amount) => {
        if (amount <= 0) return;
        set((s) => ({ stamina: Math.max(0, s.stamina - amount) }));
      },
      addStamina: (amount) => {
        if (amount <= 0) return;
        set((s) => ({
          stamina: clamp(s.stamina + amount, 0, 100),
        }));
      },
      updateGold: (updater) =>
        set((s) => ({
          gold:
            typeof updater === "function"
              ? (updater as (prev: number) => number)(s.gold)
              : updater,
        })),
      spendTreasuryForCityCpaIncrease: (cityDisplayName, cpaIncrease) => {
        const inc = Math.max(
          0,
          Math.floor(Number.isFinite(cpaIncrease) ? cpaIncrease : 0)
        );
        if (inc <= 0) return;
        const name = cityDisplayName.trim() || "本城";
        const prevGold = get().gold;
        const spent = Math.min(Math.max(0, prevGold), inc);
        if (spent <= 0) {
          useEventStore.getState().addLog(
            `【户部】拨付军饷，【${name}】拟支用 ${inc.toLocaleString("zh-CN")} 两，然国库空虚，未能拨付。`,
            "treasury"
          );
          return;
        }
        set((s) => ({ gold: Math.max(0, s.gold - spent) }));
        const short = spent < inc;
        useEventStore.getState().addLog(
          short
            ? `【户部】拨付军饷，【${name}】支用 ${spent.toLocaleString("zh-CN")} 两（国库存银不足，尚欠 ${(inc - spent).toLocaleString("zh-CN")} 两未拨）。`
            : `【户部】拨付军饷，【${name}】支用 ${spent.toLocaleString("zh-CN")} 两。`,
          "treasury"
        );
      },
      allocateFunds: (amount) => {
        const n = Math.floor(
          Number.isFinite(amount) ? (amount as number) : 0
        );
        if (n <= 0) return false;
        const s = get();
        if (s.gold < n) return false;
        set((st) => ({
          gold: st.gold - n,
          militaryFunds: Math.max(0, Math.floor(st.militaryFunds ?? 0)) + n,
        }));
        useEventStore.getState().addLog(
          `【户部】圣上御笔亲批，拨付 ${n.toLocaleString("zh-CN")} 两银钱充作军费，粮草已运往前线。`,
          "treasury"
        );
        return true;
      },
      injectGold: (amount, options) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        const n = Math.floor(amount);
        if (n <= 0) return;
        set((s) => ({ gold: s.gold + n }));
        if (!options?.silent) {
          useEventStore.getState().addLog(
            `【内务府】岁入拨入 ${n.toLocaleString("zh-CN")} 两，国库充盈。`,
            "treasury"
          );
        }
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
      recordExpense: (input) => {
        const amount = Math.max(
          0,
          Math.floor(Number.isFinite(input.amount) ? input.amount : 0)
        );
        if (amount <= 0) return false;
        const s0 = get();
        if (s0.gold < amount) return false;
        const cornerstone = input.cornerstone === true;
        const dest =
          (input.travelDestination ?? "").trim().slice(0, 32) || "九州";
        const amt = amount.toLocaleString("zh-CN");

        let baseMsg = "";
        switch (input.category) {
          case "imperial_provisions":
            baseMsg = `【御膳房】圣上进补抗炎灵食，支用 ${amt} 两，体力充沛。`;
            break;
          case "digital_gear":
            baseMsg = `【工部】圣上选购神机利器，支用 ${amt} 两，功倍事半，文学修养提升。`;
            break;
          case "wardrobe":
            baseMsg = `【尚衣监】圣上整肃衣冠，支用 ${amt} 两，仪容得体，民心称善。`;
            break;
          case "imperial_travel":
            baseMsg = `【礼部】圣上九州问道（${dest}），支用 ${amt} 两，鉴古通今，文学修养大幅提升。`;
            break;
          case "infrastructure":
            baseMsg = `【户部】圣上支用 ${amt} 两，充实九州基建，固本培元。`;
            break;
          default:
            return false;
        }
        if (cornerstone) baseMsg += "（镇国利器）";

        set((s) => {
          if (s.gold < amount) return s;
          let stamina = s.stamina;
          let literature = s.literature;
          let morale = s.morale;
          let dopaminePool = clamp(Math.floor(s.dopaminePool), 0, 14);

          if (input.category === "imperial_provisions") {
            stamina = clamp(s.stamina + 20, 0, 100);
          }
          if (input.category === "digital_gear") {
            literature = s.literature + 5;
          }
          if (input.category === "wardrobe") {
            morale = s.morale + 5;
          }
          if (input.category === "imperial_travel") {
            literature = s.literature + 10;
            dopaminePool = clamp(dopaminePool + 5, 0, 14);
          }
          if (cornerstone) {
            morale += 2;
          }
          morale = clamp(morale, 0, 100);

          return {
            gold: s.gold - amount,
            stamina,
            literature,
            morale,
            dopaminePool,
          };
        });

        useEventStore.getState().addLog(baseMsg, "treasury");
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
          `【户部】支用 ${Math.round(amount).toLocaleString("zh-CN")} 两，转存皇室私库，为巡游天下积蓄粮草。`,
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
        postDopaminePool,
        dopamineExpFed,
        dopamineDrained,
        moraleLost,
        healthLost,
      }) => {
        set((s) => {
          const stamina = clamp(s.stamina + staminaRestored, 0, 100);
          const exp = Math.max(0, s.exp - expSubtracted);
          const tokens = Math.max(0, s.tokens - tokensSubtracted);
          const mLost = Math.max(0, Math.floor(moraleLost ?? 0));
          const hLost = Math.max(0, Math.floor(healthLost ?? 0));
          let dopaminePool = s.dopaminePool;
          if (
            typeof postDopaminePool === "number" &&
            Number.isFinite(postDopaminePool) &&
            typeof dopamineExpFed === "number" &&
            Number.isFinite(dopamineExpFed)
          ) {
            const k = Math.max(0, Math.floor(tokensSubtracted));
            const P1 = clamp(Math.floor(postDopaminePool), 0, 14);
            const fed = Math.max(0, Math.floor(dopamineExpFed));
            const D = Math.max(0, Math.floor(dopamineDrained ?? 0));
            const Pfeed = clamp(P1 + D, 0, 14);
            const pre = DOPAMINE_ENERGY_PER_TICKET * k + Pfeed - fed;
            dopaminePool = clamp(pre, 0, 14);
          }
          return {
            stamina,
            exp,
            level: computeLevelFromExp(exp),
            tokens,
            dopaminePool,
            morale: clamp(s.morale + mLost, 0, 100),
            health: clamp(s.health + hLost, 0, 100),
          };
        });
      },
      submitCityReport: (cityId, dailyData) => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- 避免 emperor ↔ map 循环依赖
        const { useMapStore } = require("./map-store") as typeof import("./map-store");
        return useMapStore.getState().submitCityReport(cityId, dailyData);
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
        dopaminePool: s.dopaminePool,
        isDressed: s.isDressed,
        isEntertaining: s.isEntertaining,
        entertainmentDeadline: s.entertainmentDeadline,
        entertainmentLowHealthPenalty: s.entertainmentLowHealthPenalty,
        healthCombo: s.healthCombo,
        morale: s.morale,
        privateVault: s.privateVault,
        literature: s.literature,
        isNomadMode: s.isNomadMode,
        militaryFunds: s.militaryFunds,
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
        const dopaminePool =
          typeof p.dopaminePool === "number" && Number.isFinite(p.dopaminePool)
            ? clamp(Math.floor(p.dopaminePool), 0, 14)
            : 0;
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
        const militaryFunds =
          typeof p.militaryFunds === "number" && Number.isFinite(p.militaryFunds)
            ? Math.max(0, Math.floor(p.militaryFunds))
            : current.militaryFunds;

        return {
          ...current,
          exp,
          stamina,
          gold,
          troops,
          health,
          martialArts,
          tokens,
          dopaminePool,
          isDressed,
          isEntertaining,
          entertainmentDeadline,
          entertainmentLowHealthPenalty,
          healthCombo,
          morale,
          privateVault,
          literature,
          isNomadMode,
          militaryFunds,
          level: computeLevelFromExp(exp),
        };
      },
    }
  )
);
