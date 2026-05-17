import type { QuestPeriod, TourLeg } from "@/store/types";

export const TOUR_PERIODS: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

export const PERIOD_RANK: Record<QuestPeriod, number> = {
  早朝: 0,
  晌午: 1,
  傍晚: 2,
  深夜: 3,
};

export function sortLegsForDisplay(legs: TourLeg[]): TourLeg[] {
  return [...legs].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return PERIOD_RANK[a.period] - PERIOD_RANK[b.period];
  });
}

export function legsForDay(legs: TourLeg[], dayIndex: number): TourLeg[] {
  return legs
    .filter((l) => l.dayIndex === dayIndex)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function maxDayIndex(legs: TourLeg[]): number {
  if (legs.length === 0) return 1;
  return Math.max(1, ...legs.map((l) => l.dayIndex));
}

export function nextSortOrderInDay(legs: TourLeg[], dayIndex: number): number {
  const inDay = legsForDay(legs, dayIndex);
  if (inDay.length === 0) return 0;
  return Math.max(...inDay.map((l) => l.sortOrder)) + 1;
}

export function prevLegInDayBySortOrder(
  legs: TourLeg[],
  dayIndex: number,
  beforeSortOrder: number
): TourLeg | undefined {
  const inDay = legsForDay(legs, dayIndex).filter((l) => l.sortOrder < beforeSortOrder);
  return inDay[inDay.length - 1];
}

export function allowedPeriodsForNewLeg(
  legs: TourLeg[],
  dayIndex: number,
  sortOrder: number
): QuestPeriod[] {
  const prev = prevLegInDayBySortOrder(legs, dayIndex, sortOrder);
  const minRank = prev ? PERIOD_RANK[prev.period] : 0;
  return TOUR_PERIODS.filter((p) => PERIOD_RANK[p] >= minRank);
}

export function defaultPeriodForNewLeg(
  legs: TourLeg[],
  dayIndex: number,
  sortOrder: number
): QuestPeriod {
  const allowed = allowedPeriodsForNewLeg(legs, dayIndex, sortOrder);
  const inDay = legsForDay(legs, dayIndex);
  if (inDay.length === 0) return "早朝";
  const maxRank = Math.max(...inDay.map((l) => PERIOD_RANK[l.period]));
  const pick = TOUR_PERIODS.find((p) => PERIOD_RANK[p] === maxRank);
  if (pick && allowed.includes(pick)) return pick;
  return allowed[allowed.length - 1] ?? "早朝";
}

/** 同日内按 sortOrder 扫描，时辰不得倒退 */
export function legIdsWithChronologyWarning(legs: TourLeg[]): Set<string> {
  const warned = new Set<string>();
  const byDay = new Map<number, TourLeg[]>();
  for (const leg of legs) {
    const list = byDay.get(leg.dayIndex) ?? [];
    list.push(leg);
    byDay.set(leg.dayIndex, list);
  }
  for (const dayLegs of Array.from(byDay.values())) {
    const sorted = [...dayLegs].sort((a, b) => a.sortOrder - b.sortOrder);
    let lastRank = -1;
    for (const leg of sorted) {
      const rank = PERIOD_RANK[leg.period as QuestPeriod];
      if (rank < lastRank) warned.add(leg.id);
      lastRank = Math.max(lastRank, rank);
    }
  }
  return warned;
}
