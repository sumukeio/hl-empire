/** 尊号位阶阶梯：按累计功勋（exp）分段；与 Store 内数值型 `level` 解耦。 */

export type EmperorTitleTier = {
  minExp: number;
  /** 上界为开区间；最后一阶为 null 表示无上界 */
  maxExclusive: number | null;
  /** 位阶（如「从九品」） */
  level: string;
  /** 尊号称号（如「九品·芝麻官」） */
  title: string;
};

export const EMPEROR_TITLE_LADDER: readonly EmperorTitleTier[] = [
  { minExp: 0, maxExclusive: 500, level: "草根", title: "布衣·白身" },
  { minExp: 500, maxExclusive: 1500, level: "从九品", title: "九品·芝麻官" },
  { minExp: 1500, maxExclusive: 3500, level: "正七品", title: "县令·牧民" },
  { minExp: 3500, maxExclusive: 7000, level: "从五品", title: "知府·封疆" },
  { minExp: 7000, maxExclusive: 12000, level: "从三品", title: "巡抚·节度" },
  { minExp: 12000, maxExclusive: 20000, level: "正一品", title: "辅政·宰执" },
  { minExp: 20000, maxExclusive: 35000, level: "开国公", title: "封侯·拜将" },
  { minExp: 35000, maxExclusive: 60000, level: "潜龙", title: "问鼎·郡王" },
  { minExp: 60000, maxExclusive: 100000, level: "亲王", title: "监国·太子" },
  { minExp: 100000, maxExclusive: 200000, level: "昭昭", title: "九五·至尊" },
  { minExp: 200000, maxExclusive: 500000, level: "万世", title: "瀚翎·大帝" },
  { minExp: 500000, maxExclusive: null, level: "超凡", title: "潜龙·天帝" },
] as const;

const LAST_TIER_INDEX = EMPEROR_TITLE_LADDER.length - 1;

function clampExp(exp: number): number {
  if (!Number.isFinite(exp)) return 0;
  return Math.max(0, exp);
}

/** 当前功勋所在阶梯下标（0 … LAST_TIER_INDEX） */
export function getEmperorTitleTierIndex(exp: number): number {
  const e = clampExp(exp);
  for (let i = LAST_TIER_INDEX; i >= 0; i--) {
    if (e >= EMPEROR_TITLE_LADDER[i].minExp) return i;
  }
  return 0;
}

export function getEmperorTitleAt(exp: number): EmperorTitleTier {
  return EMPEROR_TITLE_LADDER[getEmperorTitleTierIndex(exp)];
}

export type EmperorTitleProgress = {
  tier: EmperorTitleTier;
  /** 下一阶；已达最后一阶则为 null */
  nextTier: EmperorTitleTier | null;
  /** 当前位阶区间内进度 0–100 */
  pctInCurrentTier: number;
  /** 距下一阶门槛还差的功勋；已满最后一阶则为 null */
  expToNextThreshold: number | null;
  /** 下一阶门槛 exp；无下一阶则为 null */
  nextThreshold: number | null;
  /** 已达最终阶梯 */
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
  const pctInCurrentTier = Math.min(100, Math.max(0, Math.round(rawPct * 10) / 10));
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

/** 晋升邸报文案（跨一阶或多阶时，取起止位阶名） */
export function buildEmperorTitlePromotionMessage(
  prevExp: number,
  nextExp: number
): string | null {
  const prevIdx = getEmperorTitleTierIndex(prevExp);
  const nextIdx = getEmperorTitleTierIndex(nextExp);
  if (nextIdx <= prevIdx) return null;
  const oldTier = EMPEROR_TITLE_LADDER[prevIdx];
  const newTier = EMPEROR_TITLE_LADDER[nextIdx];
  return `【捷报】圣上圣德昭彰，位阶已从「${oldTier.level}」晋升至「${newTier.level}」，天下归心！`;
}
