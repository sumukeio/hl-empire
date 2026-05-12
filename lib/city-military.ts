import type { City } from "@/store/types";

/** 军备严重不足：有兵无械，或兵械比过高（战力匹配警告）。 */
export function isCityEquipmentCritical(city: City): boolean {
  const troops = Number.isFinite(city.troops) ? Math.max(0, city.troops) : 0;
  const equipments = Number.isFinite(city.equipments)
    ? Math.max(0, city.equipments)
    : 0;
  if (troops <= 0) return false;
  if (equipments === 0) return true;
  return troops / equipments > 100;
}
