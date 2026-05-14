import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type {
  City,
  CityDailyReportData,
  CityPatch,
  CityStatus,
  Quest,
  SubmitCityReportResult,
} from "./types";
import { useEmperorStore } from "./emperor-store";
import { useEventStore } from "./event-store";
import {
  applyIndustrialSectorExp,
  type IndustrialLevelUpEvent,
  type IndustrialSector,
} from "@/lib/city-industry";

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

/** 移除不在当前任务表中的勘合进度键（换版任务集时防止脏键） */
export function pruneCityQuestProgress(
  city: City,
  validQuestIds: ReadonlySet<string>
): City {
  const qd: Record<string, number> = {};
  for (const [k, v] of Object.entries(city.questDailyCompletions ?? {})) {
    if (!validQuestIds.has(k)) continue;
    if (typeof v === "number" && Number.isFinite(v) && v > 0) {
      qd[k] = Math.min(99, Math.floor(v));
    }
  }
  const qa: Record<string, number> = {};
  for (const [k, v] of Object.entries(city.questCompletedAt ?? {})) {
    if (!validQuestIds.has(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      qa[k] = v;
    }
  }
  const completedQuestIds = Object.keys(qd).filter((id) => (qd[id] ?? 0) > 0);
  return {
    ...city,
    questDailyCompletions: qd,
    questCompletedAt: qa,
    completedQuestIds,
  };
}

/** 首次安装或无可读存档时的默认征战目标列表（可随后在造办处增删改）。 */
export function createDefaultCities(): City[] {
  return DEFAULT_CITY_NAMES.map((name, index) => ({
    id: `city-${index + 1}`,
    name,
    alias: "",
    status: 0 as CityStatus,
    memo: "",
    cpa: 0,
    leads: 0,
    orders: 0,
    troops: 0,
    equipments: 0,
    agriLevel: 0,
    commLevel: 0,
    secuLevel: 0,
    agriExp: 0,
    commExp: 0,
    secuExp: 0,
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
    leads:
      typeof partial?.leads === "number" && Number.isFinite(partial.leads)
        ? Math.max(0, Math.floor(partial.leads))
        : 0,
    orders: partial?.orders ?? 0,
    troops: partial?.troops ?? 0,
    equipments: partial?.equipments ?? 0,
    agriLevel:
      typeof partial?.agriLevel === "number" && Number.isFinite(partial.agriLevel)
        ? Math.max(0, Math.min(10, Math.floor(partial.agriLevel)))
        : 0,
    commLevel:
      typeof partial?.commLevel === "number" && Number.isFinite(partial.commLevel)
        ? Math.max(0, Math.min(10, Math.floor(partial.commLevel)))
        : 0,
    secuLevel:
      typeof partial?.secuLevel === "number" && Number.isFinite(partial.secuLevel)
        ? Math.max(0, Math.min(10, Math.floor(partial.secuLevel)))
        : 0,
    agriExp:
      typeof partial?.agriExp === "number" && Number.isFinite(partial.agriExp)
        ? Math.max(0, Math.floor(partial.agriExp))
        : 0,
    commExp:
      typeof partial?.commExp === "number" && Number.isFinite(partial.commExp)
        ? Math.max(0, Math.floor(partial.commExp))
        : 0,
    secuExp:
      typeof partial?.secuExp === "number" && Number.isFinite(partial.secuExp)
        ? Math.max(0, Math.floor(partial.secuExp))
        : 0,
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
    leads:
      typeof r.leads === "number" && Number.isFinite(r.leads)
        ? Math.max(0, Math.floor(r.leads))
        : 0,
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
    agriLevel:
      typeof r.agriLevel === "number" && Number.isFinite(r.agriLevel)
        ? Math.max(0, Math.min(10, Math.floor(r.agriLevel)))
        : 0,
    commLevel:
      typeof r.commLevel === "number" && Number.isFinite(r.commLevel)
        ? Math.max(0, Math.min(10, Math.floor(r.commLevel)))
        : 0,
    secuLevel:
      typeof r.secuLevel === "number" && Number.isFinite(r.secuLevel)
        ? Math.max(0, Math.min(10, Math.floor(r.secuLevel)))
        : 0,
    agriExp:
      typeof r.agriExp === "number" && Number.isFinite(r.agriExp)
        ? Math.max(0, Math.floor(r.agriExp))
        : 0,
    commExp:
      typeof r.commExp === "number" && Number.isFinite(r.commExp)
        ? Math.max(0, Math.floor(r.commExp))
        : 0,
    secuExp:
      typeof r.secuExp === "number" && Number.isFinite(r.secuExp)
        ? Math.max(0, Math.floor(r.secuExp))
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

export type TourCityResult =
  | { ok: true }
  | { ok: false; reason: string };

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
  /** 各城仅保留 `validQuestIds` 内的勘合键 */
  pruneQuestProgressForUnknownIds: (validQuestIds: ReadonlySet<string>) => void;
  /** 本城产业经验 +delta，可能升级；返回升级事件供邸报 */
  applyIndustrialQuestProgress: (
    cityId: string,
    sector: IndustrialSector,
    meritDelta: number
  ) => IndustrialLevelUpEvent[];
  /** 圣驾巡幸金色藩属城：耗体力与银两，奖功勋、铸券与民心 */
  tourCity: (cityId: string) => TourCityResult;
  /** 日结战报：从军费扣本日消耗，累加 cpa / leads / orders；本日出单则升为金色藩属 */
  submitCityReport: (
    cityId: string,
    dailyData: CityDailyReportData
  ) => SubmitCityReportResult;
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
      updateCity: (id, data) => {
        const prev = get().cities.find((c) => c.id === id);
        let cpaIncrease = 0;
        let payCityDisplay: string | null = null;
        if (prev) {
          const patch = data as CityPatch;
          const nextCpa =
            typeof patch.cpa === "number" && Number.isFinite(patch.cpa)
              ? Math.max(0, Math.floor(patch.cpa))
              : Math.max(0, Math.floor(Number.isFinite(prev.cpa) ? prev.cpa : 0));
          const prevCpa = Math.max(
            0,
            Math.floor(Number.isFinite(prev.cpa) ? prev.cpa : 0)
          );
          cpaIncrease = Math.max(0, nextCpa - prevCpa);
          payCityDisplay = (prev.alias?.trim() || prev.name).trim() || "本城";
        }
        set((s) => ({
          cities: s.cities.map((c) => {
            if (c.id !== id) return c;
            const { id: _drop, ...rest } = data as CityPatch & { id?: string };
            return { ...c, ...rest, id: c.id };
          }),
        }));
        if (cpaIncrease > 0 && payCityDisplay) {
          useEmperorStore
            .getState()
            .spendTreasuryForCityCpaIncrease(payCityDisplay, cpaIncrease);
        }
      },
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
      pruneQuestProgressForUnknownIds: (validQuestIds) => {
        set((s) => ({
          cities: s.cities.map((c) => pruneCityQuestProgress(c, validQuestIds)),
        }));
      },
      applyIndustrialQuestProgress: (cityId, sector, meritDelta) => {
        const levelUps: IndustrialLevelUpEvent[] = [];
        set((s) => ({
          cities: s.cities.map((c) => {
            if (c.id !== cityId) return c;
            const { nextCity, levelUps: ups } = applyIndustrialSectorExp(
              c,
              sector,
              meritDelta
            );
            levelUps.push(...ups);
            return nextCity;
          }),
        }));
        return levelUps;
      },
      tourCity: (cityId) => {
        const city = get().cities.find((c) => c.id === cityId);
        if (!city) return { ok: false, reason: "未找到该城池。" };
        if (city.status !== 3) {
          return { ok: false, reason: "非藩属城池，不得巡幸。" };
        }
        const emperor = useEmperorStore.getState();
        if (emperor.health < 50) {
          return { ok: false, reason: "龙体欠安，不宜远行" };
        }
        if (emperor.stamina < 25) {
          return { ok: false, reason: "体力不足，请稍息再议卤簿。" };
        }
        if (emperor.gold < 100) {
          return { ok: false, reason: "国库空虚，难备巡幸仪仗。" };
        }
        emperor.consumeStamina(25);
        emperor.updateGold((g) => g - 100);
        emperor.addExp(100);
        emperor.feedDopamineFromQuestReward(15);
        useEmperorStore.setState((s) => ({
          morale: Math.min(100, Math.max(0, s.morale + 2)),
        }));
        const display = city.alias?.trim() || city.name;
        useEventStore.getState().addLog(
          `【礼部】圣上起驾巡幸【${display}】，万民称颂，国运昌隆。`,
          "decree"
        );
        return { ok: true };
      },
      submitCityReport: (cityId, dailyData) => {
        const spend = Math.max(
          0,
          Math.floor(
            Number.isFinite(dailyData.dailySpend) ? dailyData.dailySpend : 0
          )
        );
        const dLeads = Math.max(
          0,
          Math.floor(
            Number.isFinite(dailyData.dailyLeads) ? dailyData.dailyLeads : 0
          )
        );
        const dOrders = Math.max(
          0,
          Math.floor(
            Number.isFinite(dailyData.dailyOrders) ? dailyData.dailyOrders : 0
          )
        );
        const prev = get().cities.find((c) => c.id === cityId);
        if (!prev) {
          return { ok: false, reason: "未找到该城池。" };
        }
        const mil = Math.max(
          0,
          Math.floor(useEmperorStore.getState().militaryFunds ?? 0)
        );
        if (mil < spend) {
          return {
            ok: false,
            reason: "军费不足，请先从国库拨款！",
          };
        }
        useEmperorStore.setState((s) => ({
          militaryFunds: Math.max(
            0,
            Math.floor(s.militaryFunds ?? 0) - spend
          ),
        }));
        const display = (prev.alias?.trim() || prev.name).trim() || "本城";
        set((s) => ({
          cities: s.cities.map((c) => {
            if (c.id !== cityId) return c;
            const nextCpa = Math.max(0, Math.floor(c.cpa)) + spend;
            const nextLeads = Math.max(0, Math.floor(c.leads ?? 0)) + dLeads;
            const nextOrders = Math.max(0, Math.floor(c.orders)) + dOrders;
            const nextStatus: CityStatus =
              dOrders > 0 ? 3 : c.status;
            return {
              ...c,
              cpa: nextCpa,
              leads: nextLeads,
              orders: nextOrders,
              status: nextStatus,
            };
          }),
        }));
        useEventStore.getState().addLog(
          `【兵部】${display} 奏报：今日度支 ${spend.toLocaleString("zh-CN")} 两，投诚 ${dLeads.toLocaleString("zh-CN")} 人，收缴粮饷 ${dOrders.toLocaleString("zh-CN")} 单。`,
          "treasury",
          { emphasis: "goldFlash" }
        );
        return { ok: true };
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
