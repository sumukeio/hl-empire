import type { City } from "@/store/types";

/** 通务司固定 id（内廷，不参与沙盘征战） */
export const TONGWU_SI_CITY_ID = "city-tongwu-si";

export const TONGWU_SI_DEFAULT_NAME = "通务司";

export const TONGWU_SI_DEFAULT_ALIAS = "跨产品 · 素材与发布";

export function isTongwuSiCity(
  city: Pick<City, "id" | "isTongwuSi" | "name">
): boolean {
  if (city.isTongwuSi === true) return true;
  if (city.id === TONGWU_SI_CITY_ID) return true;
  return city.name.trim() === TONGWU_SI_DEFAULT_NAME;
}

/** 图志司 / 沙盘用：排除通务司 */
export function getTerritoryCities(cities: readonly City[]): City[] {
  return cities.filter((c) => !isTongwuSiCity(c));
}

export function createTongwuSiCityRecord(): City {
  return {
    id: TONGWU_SI_CITY_ID,
    name: TONGWU_SI_DEFAULT_NAME,
    alias: TONGWU_SI_DEFAULT_ALIAS,
    isTongwuSi: true,
    status: 0,
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
  };
}
