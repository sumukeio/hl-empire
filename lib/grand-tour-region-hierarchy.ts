import { MACRO_REGIONS, resolveMacroRegionId } from "@/lib/city-macro-regions";
import type { TourProvinceGroup, TourRegion } from "@/store/types";

export type GrandTourProvinceNode = TourProvinceGroup & {
  regions: TourRegion[];
};

export type GrandTourMacroRegionNode = {
  id: string;
  name: string;
  sortOrder: number;
  provinces: GrandTourProvinceNode[];
};

export function buildGrandTourRegionHierarchy(
  provinceGroups: TourProvinceGroup[],
  regions: TourRegion[]
): GrandTourMacroRegionNode[] {
  const provinces: GrandTourProvinceNode[] = [...provinceGroups]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((pg) => ({
      ...pg,
      regions: regions
        .filter((r) => r.provinceGroupId === pg.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  const byMacro = new Map<string, GrandTourProvinceNode[]>();
  for (const p of provinces) {
    const macroId =
      p.macroRegionId ?? resolveMacroRegionId(undefined, p.name);
    const list = byMacro.get(macroId) ?? [];
    list.push(p);
    byMacro.set(macroId, list);
  }

  return MACRO_REGIONS.map((macro) => ({
    id: macro.id,
    name: macro.name,
    sortOrder: macro.sortOrder,
    provinces: byMacro.get(macro.id) ?? [],
  })).filter((m) => m.provinces.length > 0);
}
