import type { City } from "@/store/types";

export type IndustrialSector = "agri" | "comm" | "secu";

/** 藩属进贡：每座金色藩属城池每日 `(commLevel + 1) * 20` 两（与 `resetDailyQuests` 一致） */
export const VASSAL_COMM_TRIBUTE_UNIT = 20;

const MAX_INDUSTRY_LEVEL = 10;

/** 从 L 级升至 L+1 所需本产业经验（槽内累计） */
export function industryExpNeededForNext(level: number): number {
  if (level >= MAX_INDUSTRY_LEVEL) return 0;
  return (level + 1) * 100;
}

/** 根据军机标题关键字归类产业（优先序：农 → 商 → 安） */
export function classifyIndustrialSectorFromQuestTitle(
  title: string
): IndustrialSector | null {
  if (title.includes("工部") || title.includes("素材")) return "agri";
  if (title.includes("礼部") || title.includes("成交")) return "comm";
  if (title.includes("刑部") || title.includes("防御")) return "secu";
  return null;
}

export type IndustrialLevelUpEvent = {
  sector: IndustrialSector;
  newLevel: number;
  /** 邸报部委前缀 */
  ministry: string;
  /** 产业中文名 */
  industryLabel: string;
};

function sectorKeys(sector: IndustrialSector): {
  level: "agriLevel" | "commLevel" | "secuLevel";
  exp: "agriExp" | "commExp" | "secuExp";
  ministry: string;
  industryLabel: string;
} {
  switch (sector) {
    case "agri":
      return {
        level: "agriLevel",
        exp: "agriExp",
        ministry: "工部",
        industryLabel: "农业",
      };
    case "comm":
      return {
        level: "commLevel",
        exp: "commExp",
        ministry: "礼部",
        industryLabel: "商业",
      };
    case "secu":
      return {
        level: "secuLevel",
        exp: "secuExp",
        ministry: "刑部",
        industryLabel: "治安",
      };
  }
}

function clampLevel(n: number): number {
  return Math.max(0, Math.min(MAX_INDUSTRY_LEVEL, Math.floor(n)));
}

function clampExp(n: number): number {
  return Math.max(0, Math.min(999_999, Math.floor(n)));
}

/**
 * 为本城指定产业增加经验；可能连升多级。满 10 级后经验归零不再增长。
 */
export function applyIndustrialSectorExp(
  city: City,
  sector: IndustrialSector,
  delta: number
): { nextCity: City; levelUps: IndustrialLevelUpEvent[] } {
  const keys = sectorKeys(sector);
  let level = clampLevel(city[keys.level]);
  let exp = clampExp(city[keys.exp]);
  const levelUps: IndustrialLevelUpEvent[] = [];
  if (delta <= 0) {
    return { nextCity: city, levelUps };
  }
  if (level >= MAX_INDUSTRY_LEVEL) {
    return {
      nextCity: { ...city, [keys.level]: MAX_INDUSTRY_LEVEL, [keys.exp]: 0 },
      levelUps,
    };
  }

  exp += Math.floor(delta);
  while (level < MAX_INDUSTRY_LEVEL) {
    const need = industryExpNeededForNext(level);
    if (need <= 0 || exp < need) break;
    exp -= need;
    level += 1;
    levelUps.push({
      sector,
      newLevel: level,
      ministry: keys.ministry,
      industryLabel: keys.industryLabel,
    });
  }
  if (level >= MAX_INDUSTRY_LEVEL) {
    level = MAX_INDUSTRY_LEVEL;
    exp = 0;
  }

  return {
    nextCity: { ...city, [keys.level]: level, [keys.exp]: exp },
    levelUps,
  };
}

/** 单城「藩属进贡」日额（仅 `status === 3` 生效，否则为 0） */
export function vassalCityDailyTribute(
  city: Pick<City, "status" | "commLevel">
): number {
  if (city.status !== 3) return 0;
  const lv = clampLevel(city.commLevel ?? 0);
  return (lv + 1) * VASSAL_COMM_TRIBUTE_UNIT;
}

/** 跨日藩属进贡：全部金色藩属城池日贡之和 */
export function totalVassalDailyTribute(cities: readonly City[]): number {
  let sum = 0;
  for (const c of cities) {
    sum += vassalCityDailyTribute(c);
  }
  return Math.max(0, Math.floor(sum));
}

/** 下一级进度条 0–100（已满级为 100） */
export function industryProgressPercent(
  level: number,
  exp: number
): number {
  const lv = clampLevel(level);
  if (lv >= MAX_INDUSTRY_LEVEL) return 100;
  const need = industryExpNeededForNext(lv);
  if (need <= 0) return 0;
  return Math.min(100, (clampExp(exp) / need) * 100);
}
