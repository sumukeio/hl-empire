import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { City, CityPatch, CityStatus } from "./types";

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
  };
}

export function migrateCity(raw: unknown): City {
  const r = raw as Record<string, unknown>;
  const status = r.status;
  const st =
    status === 0 || status === 1 || status === 2 || status === 3 ? status : 0;
  const completedQuestIds: string[] = Array.isArray(r.completedQuestIds)
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
  /** 切换某城某条军机政务的勘合状态（仅改疆域档；体力与功勋由军机处调用方处理）。 */
  toggleCityQuest: (cityId: string, questId: string) => void;
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
      toggleCityQuest: (cityId, questId) => {
        set((s) => ({
          cities: s.cities.map((c) => {
            if (c.id !== cityId) return c;
            const has = c.completedQuestIds.includes(questId);
            if (has) {
              const questCompletedAt = { ...c.questCompletedAt };
              delete questCompletedAt[questId];
              return {
                ...c,
                completedQuestIds: c.completedQuestIds.filter((x) => x !== questId),
                questCompletedAt,
              };
            }
            return {
              ...c,
              completedQuestIds: [...c.completedQuestIds, questId],
              questCompletedAt: {
                ...c.questCompletedAt,
                [questId]: Date.now(),
              },
            };
          }),
        }));
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
