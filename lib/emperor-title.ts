/**
 * 尊号位阶：按累计功勋（exp）分段；与 Store 内数值型 `level` 解耦。
 * 「九品中正」扩展：多阶品流，正品 / 从品交错。
 */

export type EmperorTitleTier = {
  minExp: number;
  /** 上界为开区间；最后一阶为 null 表示无上界 */
  maxExclusive: number | null;
  /** 位阶简名（御案「位阶」行） */
  level: string;
  /** 尊号全称（御案尊号高亮行） */
  title: string;
};

/** 全量阶梯：自下而上依次为布衣 → 超凡（共 25 档） */
export const EMPEROR_TITLE_LADDER: readonly EmperorTitleTier[] = [
  { minExp: 0, maxExclusive: 1_000, level: "布衣", title: "布衣·白身" },
  { minExp: 1_000, maxExclusive: 2_000, level: "从九品", title: "从九品·文林郎" },
  { minExp: 2_000, maxExclusive: 4_000, level: "正九品", title: "正九品·宣义郎" },
  { minExp: 4_000, maxExclusive: 7_000, level: "从八品", title: "从八品·给事郎" },
  { minExp: 7_000, maxExclusive: 11_000, level: "正八品", title: "正八品·承奉郎" },
  { minExp: 11_000, maxExclusive: 16_000, level: "从七品", title: "从七品·朝散郎" },
  { minExp: 16_000, maxExclusive: 25_000, level: "正七品", title: "正七品·县令牧民" },
  { minExp: 25_000, maxExclusive: 40_000, level: "从六品", title: "从六品·奉议郎" },
  { minExp: 40_000, maxExclusive: 60_000, level: "正六品", title: "正六品·承议郎" },
  { minExp: 60_000, maxExclusive: 90_000, level: "从五品", title: "从五品·奉直大夫" },
  { minExp: 90_000, maxExclusive: 130_000, level: "正五品", title: "正五品·知府封疆" },
  { minExp: 130_000, maxExclusive: 180_000, level: "从四品", title: "从四品·朝请大夫" },
  { minExp: 180_000, maxExclusive: 250_000, level: "正四品", title: "正四品·中大夫" },
  { minExp: 250_000, maxExclusive: 350_000, level: "从三品", title: "从三品·通议大夫" },
  { minExp: 350_000, maxExclusive: 500_000, level: "正三品", title: "正三品·资政大夫" },
  { minExp: 500_000, maxExclusive: 750_000, level: "从二品", title: "从二品·中奉大夫" },
  { minExp: 750_000, maxExclusive: 1_200_000, level: "正二品", title: "正二品·尚书少傅" },
  { minExp: 1_200_000, maxExclusive: 2_000_000, level: "从一品", title: "从一品·太保司徒" },
  { minExp: 2_000_000, maxExclusive: 3_500_000, level: "正一品", title: "正一品·辅政宰执" },
  { minExp: 3_500_000, maxExclusive: 6_000_000, level: "开国公", title: "开国公·封侯拜将" },
  { minExp: 6_000_000, maxExclusive: 10_000_000, level: "郡王", title: "郡王·问鼎郡王" },
  { minExp: 10_000_000, maxExclusive: 20_000_000, level: "亲王", title: "亲王·监国太子" },
  { minExp: 20_000_000, maxExclusive: 50_000_000, level: "昭昭", title: "昭昭·九五至尊" },
  { minExp: 50_000_000, maxExclusive: 100_000_000, level: "万世", title: "万世·瀚翎大帝" },
  { minExp: 100_000_000, maxExclusive: null, level: "超凡", title: "超凡·潜龙天帝" },
] as const;

const LAST_TIER_INDEX = EMPEROR_TITLE_LADDER.length - 1;

const PIN_NUM: Record<string, number> = {
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
};

function clampExp(exp: number): number {
  if (!Number.isFinite(exp)) return 0;
  return Math.max(0, exp);
}

/** 从尊号中解析「品」序数（九品～一品）；公、王等无品则 null */
export function parsePinFromTitle(title: string): number | null {
  const m = title.match(/[从正]([一二三四五六七八九])品/);
  if (!m) return null;
  return PIN_NUM[m[1] as keyof typeof PIN_NUM] ?? null;
}

/** 正品 / 从品 / 其它（布衣、公、王等） */
export function getRankToneFromTitle(title: string): "zheng" | "cong" | "other" {
  if (title.startsWith("正")) return "zheng";
  if (title.startsWith("从")) return "cong";
  return "other";
}

/** 当前功勋所在阶梯下标（0 … LAST_TIER_INDEX） */
export function getEmperorTitleTierIndex(exp: number): number {
  const e = clampExp(exp);
  for (let i = LAST_TIER_INDEX; i >= 0; i--) {
    if (e >= EMPEROR_TITLE_LADDER[i].minExp) return i;
  }
  return 0;
}

/** 按累计功勋解析当前位阶与尊号 */
export function getEmperorTitle(exp: number): EmperorTitleTier {
  return EMPEROR_TITLE_LADDER[getEmperorTitleTierIndex(exp)];
}

/** @deprecated 请使用 `getEmperorTitle` */
export function getEmperorTitleAt(exp: number): EmperorTitleTier {
  return getEmperorTitle(exp);
}

export type EmperorTitleProgress = {
  tier: EmperorTitleTier;
  nextTier: EmperorTitleTier | null;
  pctInCurrentTier: number;
  expToNextThreshold: number | null;
  nextThreshold: number | null;
  isApex: boolean;
};

export function getEmperorTitleProgress(exp: number): EmperorTitleProgress {
  const e = clampExp(exp);
  const idx = getEmperorTitleTierIndex(e);
  const tier = EMPEROR_TITLE_LADDER[idx];
  const next =
    idx < LAST_TIER_INDEX ? EMPEROR_TITLE_LADDER[idx + 1] : null;

  if (!next) {
    return {
      tier,
      nextTier: null,
      pctInCurrentTier: 100,
      expToNextThreshold: null,
      nextThreshold: null,
      isApex: true,
    };
  }

  const span = next.minExp - tier.minExp;
  const into = e - tier.minExp;
  const rawPct = span <= 0 ? 100 : (into / span) * 100;
  const pctInCurrentTier = Math.min(
    100,
    Math.max(0, Math.round(rawPct * 10) / 10)
  );
  const expToNextThreshold = Math.max(0, Math.ceil(next.minExp - e));

  return {
    tier,
    nextTier: next,
    pctInCurrentTier,
    expToNextThreshold,
    nextThreshold: next.minExp,
    isApex: false,
  };
}

/** 跨阶晋升主邸报文案 */
export function buildEmperorTitlePromotionMessage(
  prevExp: number,
  nextExp: number
): string | null {
  const prevIdx = getEmperorTitleTierIndex(prevExp);
  const nextIdx = getEmperorTitleTierIndex(nextExp);
  if (nextIdx <= prevIdx) return null;
  const newTier = EMPEROR_TITLE_LADDER[nextIdx];
  return `【捷报】圣上圣德昭彰，已突破商业瓶颈，位列 ${newTier.level}！`;
}

export type TitlePromotionVisualFlags = {
  /** 品位升降：品序数变化（如八品→七品），触发加长金光 */
  goldLong: boolean;
  /** 从九升正九等同品序：从→正，触发朱红捷报 */
  crimsonZhengCong: boolean;
};

/**
 * 从旧阶下标到新阶下标，扫描每一档边界上的「品位」「品级(正从)」跨越。
 * 用于邸报特效：品位 → goldFlashLong；从→正同品 → crimsonDecree。
 */
export function analyzeTitlePromotionVisualFlags(
  prevIdx: number,
  nextIdx: number
): TitlePromotionVisualFlags {
  if (nextIdx <= prevIdx) {
    return { goldLong: false, crimsonZhengCong: false };
  }
  let goldLong = false;
  let crimsonZhengCong = false;
  for (let i = prevIdx + 1; i <= nextIdx; i++) {
    const low = EMPEROR_TITLE_LADDER[i - 1];
    const high = EMPEROR_TITLE_LADDER[i];
    const pLow = parsePinFromTitle(low.title);
    const pHigh = parsePinFromTitle(high.title);
    if (pLow != null && pHigh != null && pLow !== pHigh) {
      goldLong = true;
    }
    if (
      pLow != null &&
      pHigh != null &&
      pLow === pHigh &&
      low.title.startsWith("从") &&
      high.title.startsWith("正")
    ) {
      crimsonZhengCong = true;
    }
  }
  return { goldLong, crimsonZhengCong };
}
