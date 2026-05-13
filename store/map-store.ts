import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { City, CityPatch, CityStatus, Quest } from "./types";

const DEFAULT_CITY_NAMES = [
  "长安",
  "洛阳",
  "成都",
  "建业",
  "邺城",
  "晋阳",
  "江陵",
  "寿春",
  "下邳",
  "陈留",
  "许昌",
  "天水",
  "武威",
  "汉中",
  "柴桑",
  "襄阳",
  "广陵",
  "涿郡",
  "蓟城",
  "临淄",
] as const;

/** 读取本城本日某任务已勘合次数（兼容仅有 completedQuestIds 的旧档） */
export function getQuestDailyCount(
  city: Pick<City, "questDailyCompletions" | "completedQuestIds">,
  questId: string
): number {
  const n = city.questDailyCompletions?.[questId];
  if (typeof n === "number" && Number.isFinite(n) && n > 0) {
    return Math.min(99, Math.floor(n));
  }
  return city.completedQuestIds.includes(questId) ? 1 : 0;
}

/** 是否已达该任务配置的「本日上限」 */
export function isQuestFullyCompletedToday(
  city: City,
  quest: Pick<Quest, "id" | "maxCompletionsPerDay">
): boolean {
  const max = Math.max(1, Math.min(99, quest.maxCompletionsPerDay ?? 1));
  return getQuestDailyCount(city, quest.id) >= max;
}

/** 首次安装或无可读存档时的默认疆域（可随后在造办处增删改）。 */
export function createDefaultCities(): City[] {
  return DEFAULT_CITY_NAMES.map((name, index) => ({
    id: `city-${index + 1}`,
    name,
    alias: "",
    status: 0 as CityStatus,
    memo: "",
    cpa: 0,
    orders: 0,
    troops: 0,
    equipments: 0,
    completedQuestIds: [],
    questCompletedAt: {},
    questDailyCompletions: {},
  }));
}

function newCityId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `city-${crypto.randomUUID()}`;
  }
  return `city-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createEmptyCity(partial?: Partial<Omit<City, "id">>): City {
  return {
    id: newCityId(),
    name: partial?.name ?? "新城",
    alias: partial?.alias ?? "",
    status: partial?.status ?? 0,
    memo: partial?.memo ?? "",
    cpa: partial?.cpa ?? 0,
    orders: partial?.orders ?? 0,
    troops: partial?.troops ?? 0,
    equipments: partial?.equipments ?? 0,
    completedQuestIds: partial?.completedQuestIds ?? [],
    questCompletedAt: partial?.questCompletedAt ?? {},
    questDailyCompletions: partial?.questDailyCompletions ?? {},
  };
}

export function migrateCity(raw: unknown): City {
  const r = raw as Record<string, unknown>;
  const status = r.status;
  const st =
    status === 0 || status === 1 || status === 2 || status === 3 ? status : 0;
  const completedQuestIdsLegacy: string[] = Array.isArray(r.completedQuestIds)
    ? r.completedQuestIds.filter((x): x is string => typeof x === "string")
    : [];
  const questCompletedAt: Record<string, number> = {};
  const rawTimes = r.questCompletedAt;
  if (rawTimes && typeof rawTimes === "object" && !Array.isArray(rawTimes)) {
    for (const [k, v] of Object.entries(rawTimes as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        questCompletedAt[k] = v;
      }
    }
  }
  const questDailyCompletions: Record<string, number> = {};
  const rawCounts = r.questDailyCompletions;
  if (rawCounts && typeof rawCounts === "object" && !Array.isArray(rawCounts)) {
    for (const [k, v] of Object.entries(rawCounts as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v) && v > 0) {
        questDailyCompletions[k] = Math.min(99, Math.floor(v));
      }
    }
  }
  for (const qid of completedQuestIdsLegacy) {
    if (questDailyCompletions[qid] === undefined) {
      questDailyCompletions[qid] = 1;
    }
  }
  const completedQuestIds = Object.keys(questDailyCompletions).filter(
    (k) => (questDailyCompletions[k] ?? 0) > 0
  );
  const city: City = {
    id: typeof r.id === "string" ? r.id : newCityId(),
    name: typeof r.name === "string" ? r.name : "未命名",
    alias: typeof r.alias === "string" ? r.alias : "",
    status: st,
    memo: typeof r.memo === "string" ? r.memo : "",
    cpa: typeof r.cpa === "number" && Number.isFinite(r.cpa) ? r.cpa : 0,
    orders:
      typeof r.orders === "number" && Number.isFinite(r.orders) ? r.orders : 0,
    troops:
      typeof r.troops === "number" && Number.isFinite(r.troops)
        ? Math.max(0, r.troops)
        : 0,
    equipments:
      typeof r.equipments === "number" && Number.isFinite(r.equipments)
        ? Math.max(0, r.equipments)
        : 0,
    completedQuestIds,
    questCompletedAt,
    questDailyCompletions,
  };
  for (const qid of city.completedQuestIds) {
    if (city.questCompletedAt[qid] === undefined) {
      city.questCompletedAt[qid] = 0;
    }
  }
  return city;
}

export type BulkAddCitiesResult = {
  addedCount: number;
  skippedCount: number;
};

export interface MapState {
  cities: City[];
}

export interface MapActions {
  /** 若与现有城池 `name.trim()` 重名则拒绝写入，返回 `false`。 */
  addCity: (city: City) => boolean;
  removeCity: (id: string) => void;
  updateCity: (id: string, data: CityPatch) => void;
  /** 按 id 批量移除（忽略空串 / 无效 id）。 */
  bulkRemoveCities: (ids: string[]) => void;
  /**
   * 批量追加：跳过与现有 `name` 重名及同批内重复名。
   * `skippedCount` 含：已存在、同批重复、空名称。
   */
  bulkAddCities: (names: string[]) => BulkAddCitiesResult;
  /** 本日成功勘合 +1（未达上限时）；返回是否写入成功 */
  incrementQuestCompletion: (
    cityId: string,
    questId: string,
    maxPerDay: number
  ) => boolean;
  /** 清空本城本日该任务勘合次数与时间戳 */
  clearQuestCompletionsForDay: (cityId: string, questId: string) => void;
  /** 撤回一次勘合（次数 −1）；返回是否曾大于 0 */
  decrementQuestCompletion: (cityId: string, questId: string) => boolean;
}

export const useMapStore = create<MapState & MapActions>()(
  persist(
    (set, get) => ({
      cities: [],
      addCity: (city) => {
        const name = (city.name ?? "").trim();
        if (!name) return false;
        if (get().cities.some((c) => c.name.trim() === name)) return false;
        set((s) => ({
          cities: [
            ...s.cities,
            migrateCity({ ...city, id: city.id || newCityId() }),
          ],
        }));
        return true;
      },
      removeCity: (id) =>
        set((s) => ({
          cities: s.cities.filter((c) => c.id !== id),
        })),
      updateCity: (id, data) =>
        set((s) => ({
          cities: s.cities.map((c) => {
            if (c.id !== id) return c;
            const { id: _drop, ...rest } = data as CityPatch & { id?: string };
            return { ...c, ...rest, id: c.id };
          }),
        })),
      bulkRemoveCities: (ids) => {
        const idSet = new Set(ids.filter((x) => typeof x === "string" && x.length > 0));
        if (idSet.size === 0) return;
        set((s) => ({
          cities: s.cities.filter((c) => !idSet.has(c.id)),
        }));
      },
      bulkAddCities: (names) => {
        const result: BulkAddCitiesResult = { addedCount: 0, skippedCount: 0 };
        set((s) => {
          const existing = new Set(
            s.cities.map((c) => c.name.trim()).filter(Boolean)
          );
          const toAdd: City[] = [];
          const seenInput = new Set<string>();
          for (const raw of names) {
            const name = String(raw).trim();
            if (!name) {
              result.skippedCount += 1;
              continue;
            }
            if (seenInput.has(name)) {
              result.skippedCount += 1;
              continue;
            }
            seenInput.add(name);
            if (existing.has(name)) {
              result.skippedCount += 1;
              continue;
            }
            existing.add(name);
            toAdd.push(
              createEmptyCity({
                name,
                alias: "",
                status: 0,
                memo: "",
                cpa: 0,
                orders: 0,
                troops: 0,
                equipments: 0,
              })
            );
          }
          result.addedCount = toAdd.length;
          if (toAdd.length === 0) return {};
          return { cities: [...s.cities, ...toAdd] };
        });
        return result;
      },
      incrementQuestCompletion: (cityId, questId, maxPerDay) => {
        const cap = Math.max(1, Math.min(99, maxPerDay));
        let ok = false;
        set((s) => ({
          cities: s.cities.map((c) => {
            if (c.id !== cityId) return c;
            const count = getQuestDailyCount(c, questId);
            if (count >= cap) return c;
            ok = true;
            const next = count + 1;
            const questDailyCompletions = {
              ...(c.questDailyCompletions ?? {}),
              [questId]: next,
            };
            const completedQuestIds = c.completedQuestIds.includes(questId)
              ? c.completedQuestIds
              : [...c.completedQuestIds, questId];
            const questCompletedAt = {
              ...c.questCompletedAt,
              [questId]: Date.now(),
            };
            return {
              ...c,
              questDailyCompletions,
              completedQuestIds,
              questCompletedAt,
            };
          }),
        }));
        return ok;
      },
      clearQuestCompletionsForDay: (cityId, questId) => {
        set((s) => ({
          cities: s.cities.map((c) => {
            if (c.id !== cityId) return c;
            const questDailyCompletions = { ...(c.questDailyCompletions ?? {}) };
            delete questDailyCompletions[questId];
            const questCompletedAt = { ...c.questCompletedAt };
            delete questCompletedAt[questId];
            return {
              ...c,
              questDailyCompletions,
              completedQuestIds: c.completedQuestIds.filter((x) => x !== questId),
              questCompletedAt,
            };
          }),
        }));
      },
      decrementQuestCompletion: (cityId, questId) => {
        let mutated = false;
        set((prev) => ({
          cities: prev.cities.map((c) => {
            if (c.id !== cityId) return c;
            const count = getQuestDailyCount(c, questId);
            if (count <= 0) return c;
            mutated = true;
            const next = count - 1;
            const questDailyCompletions = { ...(c.questDailyCompletions ?? {}) };
            if (next <= 0) {
              delete questDailyCompletions[questId];
            } else {
              questDailyCompletions[questId] = next;
            }
            const questCompletedAt = { ...c.questCompletedAt };
            if (next <= 0) {
              delete questCompletedAt[questId];
            } else {
              questCompletedAt[questId] = Date.now();
            }
            const completedQuestIds =
              next <= 0
                ? c.completedQuestIds.filter((x) => x !== questId)
                : c.completedQuestIds;
            return {
              ...c,
              questDailyCompletions,
              completedQuestIds,
              questCompletedAt,
            };
          }),
        }));
        return mutated;
      },
    }),
    {
      name: "hanling-map",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ cities: s.cities }),
      merge: (persisted, current) => {
        const p = persisted as Partial<MapState> | undefined;
        if (!p || !Array.isArray(p.cities)) {
          return { ...current, cities: [] };
        }
        return {
          ...current,
          cities: p.cities.map((c) => migrateCity(c)),
        };
      },
    }
  )
);
