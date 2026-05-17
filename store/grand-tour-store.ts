import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { CITY_ATLAS_SEED } from "@/lib/city-atlas-seed";
import { resolveMacroRegionId } from "@/lib/city-macro-regions";
import { formatTourRegionLabel } from "@/lib/grand-tour-labels";
import {
  defaultPeriodForNewLeg,
  maxDayIndex,
  nextSortOrderInDay,
} from "@/lib/grand-tour-period";
import type {
  GrandTour,
  GrandTourAtlas,
  GrandTourStatus,
  TourLeg,
  TourLegTransport,
  TourItemKind,
  TourLodgeCatalogItem,
  TourMealCatalogItem,
  TourPoi,
  TourProvinceGroup,
  TourRegion,
  TourTransportCatalogItem,
} from "@/store/types";

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildSeedAtlas(): GrandTourAtlas {
  const provinceGroups: TourProvinceGroup[] = [];
  const regions: TourRegion[] = [];

  for (const g of CITY_ATLAS_SEED) {
    const pgId = `prov-${g.sortOrder}`;
    provinceGroups.push({
      id: pgId,
      name: g.name,
      sortOrder: g.sortOrder,
      macroRegionId: g.macroRegionId,
    });
    g.cities.forEach((c, ci) => {
      regions.push({
        id: `region-${g.sortOrder}-${ci}`,
        provinceGroupId: pgId,
        ancientName: c.ancientName,
        modernName: c.modernName,
        sortOrder: ci,
        pois: [],
      });
    });
  }

  return {
    provinceGroups,
    regions,
    meals: [],
    lodges: [],
    transports: [],
  };
}

export function suggestTourTitle(
  tour: Pick<GrandTour, "primaryRegionId" | "legs">,
  regions: TourRegion[]
): string {
  const region = tour.primaryRegionId
    ? regions.find((r) => r.id === tour.primaryRegionId)
    : undefined;
  const days = maxDayIndex(tour.legs);
  const regionLabel = region ? formatTourRegionLabel(region) : "巡游";
  return `${regionLabel} · ${days}日`;
}

type GrandTourState = GrandTourAtlas & {
  atlasSeeded: boolean;
  tours: GrandTour[];
  activeTourId: string | null;
};

type GrandTourActions = {
  ensureAtlasSeed: () => void;
  setActiveTourId: (id: string | null) => void;
  createTour: (primaryRegionId?: string) => string;
  updateTour: (
    id: string,
    patch: Partial<
      Pick<GrandTour, "title" | "primaryRegionId" | "status" | "startDate" | "endDate" | "note">
    >
  ) => void;
  removeTour: (id: string) => void;
  addLeg: (tourId: string, partial: Partial<TourLeg> & { kind: TourItemKind }) => string;
  updateLeg: (tourId: string, legId: string, patch: Partial<TourLeg>) => void;
  removeLeg: (tourId: string, legId: string) => void;
  duplicateLeg: (tourId: string, legId: string) => string | null;
  reorderLegsInDay: (tourId: string, dayIndex: number, orderedIds: string[]) => void;
  moveLegToDay: (tourId: string, legId: string, dayIndex: number) => void;
  refreshTourTitle: (tourId: string) => void;
  addPoi: (regionId: string, name: string, defaultTicketPrice?: number) => string | null;
  updatePoi: (
    regionId: string,
    poiId: string,
    patch: Partial<Pick<TourPoi, "name" | "defaultTicketPrice" | "sortOrder">>
  ) => void;
  removePoi: (regionId: string, poiId: string) => { ok: true } | { ok: false; reason: string };
  addMeal: (item: Omit<TourMealCatalogItem, "id" | "sortOrder">) => string;
  updateMeal: (id: string, patch: Partial<Omit<TourMealCatalogItem, "id">>) => void;
  removeMeal: (id: string) => { ok: true } | { ok: false; reason: string };
  addLodge: (item: Omit<TourLodgeCatalogItem, "id" | "sortOrder">) => string;
  updateLodge: (id: string, patch: Partial<Omit<TourLodgeCatalogItem, "id">>) => void;
  removeLodge: (id: string) => { ok: true } | { ok: false; reason: string };
  addTransport: (item: Omit<TourTransportCatalogItem, "id" | "sortOrder">) => string;
  updateTransport: (id: string, patch: Partial<Omit<TourTransportCatalogItem, "id">>) => void;
  removeTransport: (id: string) => { ok: true } | { ok: false; reason: string };
  countLegReferences: (ref: {
    regionId?: string;
    poiId?: string;
    mealCatalogId?: string;
    lodgeCatalogId?: string;
    transportCatalogId?: string;
  }) => number;
  replaceAtlasFromBackup: (atlas: GrandTourAtlas) => void;
  replaceToursFromBackup: (tours: GrandTour[], activeTourId: string | null) => void;
};

function mapTourLegs(
  tour: GrandTour,
  mapper: (legs: TourLeg[]) => TourLeg[]
): GrandTour {
  return { ...tour, legs: mapper(tour.legs) };
}

export const useGrandTourStore = create<GrandTourState & GrandTourActions>()(
  persist(
    (set, get) => ({
      ...buildSeedAtlas(),
      atlasSeeded: true,
      tours: [],
      activeTourId: null,

      ensureAtlasSeed: () => {
        const s = get();
        if (s.atlasSeeded && s.regions.length > 0) {
          const needsMacro = s.provinceGroups.some((pg) => !pg.macroRegionId);
          if (needsMacro) {
            const seedMap = new Map(
              CITY_ATLAS_SEED.map((g) => [g.sortOrder, g])
            );
            set({
              provinceGroups: s.provinceGroups.map((pg) => ({
                ...pg,
                macroRegionId:
                  pg.macroRegionId ??
                  seedMap.get(pg.sortOrder)?.macroRegionId ??
                  resolveMacroRegionId(undefined, pg.name),
              })),
            });
          }
          return;
        }
        const seeded = buildSeedAtlas();
        set({
          ...seeded,
          atlasSeeded: true,
        });
      },

      setActiveTourId: (id) => set({ activeTourId: id }),

      createTour: (primaryRegionId) => {
        const id = newId("tour");
        const tour: GrandTour = {
          id,
          title: suggestTourTitle(
            { primaryRegionId, legs: [] },
            get().regions
          ),
          titleCustomized: false,
          primaryRegionId,
          legs: [],
          status: "draft",
        };
        set((s) => ({
          tours: [tour, ...s.tours],
          activeTourId: id,
        }));
        return id;
      },

      updateTour: (id, patch) => {
        set((s) => ({
          tours: s.tours.map((t) => {
            if (t.id !== id) return t;
            const next = { ...t, ...patch };
            if (patch.title !== undefined && patch.title !== t.title) {
              next.titleCustomized = true;
            }
            return next;
          }),
        }));
      },

      removeTour: (id) => {
        set((s) => ({
          tours: s.tours.filter((t) => t.id !== id),
          activeTourId: s.activeTourId === id ? null : s.activeTourId,
        }));
      },

      addLeg: (tourId, partial) => {
        const legId = newId("leg");
        const dayIndex = partial.dayIndex ?? maxDayIndex(get().tours.find((t) => t.id === tourId)?.legs ?? []);
        const sortOrder =
          partial.sortOrder ?? nextSortOrderInDay(
            get().tours.find((t) => t.id === tourId)?.legs ?? [],
            dayIndex
          );
        const legs = get().tours.find((t) => t.id === tourId)?.legs ?? [];
        const period =
          partial.period ??
          defaultPeriodForNewLeg(legs, dayIndex, sortOrder);

        const leg: TourLeg = {
          id: legId,
          dayIndex,
          period,
          sortOrder,
          kind: partial.kind,
          regionId: partial.regionId,
          poiId: partial.poiId,
          mealCatalogId: partial.mealCatalogId,
          lodgeCatalogId: partial.lodgeCatalogId,
          transportCatalogId: partial.transportCatalogId,
          title: partial.title ?? "",
          subtitle: partial.subtitle,
          price: partial.price,
          transport: partial.transport,
        };

        set((s) => ({
          tours: s.tours.map((t) =>
            t.id === tourId ? { ...t, legs: [...t.legs, leg] } : t
          ),
        }));
        get().refreshTourTitle(tourId);
        return legId;
      },

      updateLeg: (tourId, legId, patch) => {
        set((s) => ({
          tours: s.tours.map((t) =>
            t.id === tourId
              ? mapTourLegs(t, (legs) =>
                  legs.map((l) => (l.id === legId ? { ...l, ...patch } : l))
                )
              : t
          ),
        }));
        get().refreshTourTitle(tourId);
      },

      removeLeg: (tourId, legId) => {
        set((s) => ({
          tours: s.tours.map((t) =>
            t.id === tourId
              ? mapTourLegs(t, (legs) => legs.filter((l) => l.id !== legId))
              : t
          ),
        }));
        get().refreshTourTitle(tourId);
      },

      duplicateLeg: (tourId, legId) => {
        const tour = get().tours.find((t) => t.id === tourId);
        const src = tour?.legs.find((l) => l.id === legId);
        if (!tour || !src) return null;
        const newSort = src.sortOrder + 1;
        const adjusted = tour.legs.map((l) =>
          l.dayIndex === src.dayIndex && l.sortOrder >= newSort
            ? { ...l, sortOrder: l.sortOrder + 1 }
            : l
        );
        const copy: TourLeg = {
          ...src,
          id: newId("leg"),
          sortOrder: newSort,
        };
        set((s) => ({
          tours: s.tours.map((t) =>
            t.id === tourId ? { ...t, legs: [...adjusted, copy] } : t
          ),
        }));
        get().refreshTourTitle(tourId);
        return copy.id;
      },

      reorderLegsInDay: (tourId, dayIndex, orderedIds) => {
        set((s) => ({
          tours: s.tours.map((t) => {
            if (t.id !== tourId) return t;
            const inDay = t.legs.filter((l) => l.dayIndex === dayIndex);
            const idSet = new Set(orderedIds);
            if (inDay.length !== orderedIds.length || inDay.some((l) => !idSet.has(l.id))) {
              return t;
            }
            const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
            return mapTourLegs(t, (legs) =>
              legs.map((l) =>
                l.dayIndex === dayIndex && orderMap.has(l.id)
                  ? { ...l, sortOrder: orderMap.get(l.id)! }
                  : l
              )
            );
          }),
        }));
      },

      moveLegToDay: (tourId, legId, dayIndex) => {
        const tour = get().tours.find((t) => t.id === tourId);
        if (!tour) return;
        const sortOrder = nextSortOrderInDay(tour.legs, dayIndex);
        const period = defaultPeriodForNewLeg(tour.legs, dayIndex, sortOrder);
        get().updateLeg(tourId, legId, { dayIndex, sortOrder, period });
      },

      refreshTourTitle: (tourId) => {
        const tour = get().tours.find((t) => t.id === tourId);
        if (!tour || tour.titleCustomized) return;
        const auto = suggestTourTitle(tour, get().regions);
        set((s) => ({
          tours: s.tours.map((t) =>
            t.id === tourId ? { ...t, title: auto } : t
          ),
        }));
      },

      addPoi: (regionId, name, defaultTicketPrice) => {
        const trimmed = name.trim();
        if (!trimmed) return null;
        const poiId = newId("poi");
        set((s) => ({
          regions: s.regions.map((r) => {
            if (r.id !== regionId) return r;
            const sortOrder = r.pois.length;
            return {
              ...r,
              pois: [
                ...r.pois,
                { id: poiId, name: trimmed, sortOrder, defaultTicketPrice },
              ],
            };
          }),
        }));
        return poiId;
      },

      updatePoi: (regionId, poiId, patch) => {
        set((s) => ({
          regions: s.regions.map((r) =>
            r.id === regionId
              ? {
                  ...r,
                  pois: r.pois.map((p) => (p.id === poiId ? { ...p, ...patch } : p)),
                }
              : r
          ),
        }));
      },

      removePoi: (regionId, poiId) => {
        const refs = get().countLegReferences({ poiId });
        if (refs > 0) {
          return {
            ok: false,
            reason: `已有 ${refs} 条行程引用此胜景，仅除名库藏，不改旧行程。`,
          };
        }
        set((s) => ({
          regions: s.regions.map((r) =>
            r.id === regionId
              ? { ...r, pois: r.pois.filter((p) => p.id !== poiId) }
              : r
          ),
        }));
        return { ok: true };
      },

      addMeal: (item) => {
        const id = newId("meal");
        set((s) => ({
          meals: [
            ...s.meals,
            { ...item, id, sortOrder: s.meals.length },
          ],
        }));
        return id;
      },

      updateMeal: (id, patch) => {
        set((s) => ({
          meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },

      removeMeal: (id) => {
        const refs = get().countLegReferences({ mealCatalogId: id });
        if (refs > 0) {
          return { ok: false, reason: `已有 ${refs} 条行程引用，仅除名库藏。` };
        }
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) }));
        return { ok: true };
      },

      addLodge: (item) => {
        const id = newId("lodge");
        set((s) => ({
          lodges: [...s.lodges, { ...item, id, sortOrder: s.lodges.length }],
        }));
        return id;
      },

      updateLodge: (id, patch) => {
        set((s) => ({
          lodges: s.lodges.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },

      removeLodge: (id) => {
        const refs = get().countLegReferences({ lodgeCatalogId: id });
        if (refs > 0) {
          return { ok: false, reason: `已有 ${refs} 条行程引用，仅除名库藏。` };
        }
        set((s) => ({ lodges: s.lodges.filter((m) => m.id !== id) }));
        return { ok: true };
      },

      addTransport: (item) => {
        const id = newId("transport");
        set((s) => ({
          transports: [
            ...s.transports,
            { ...item, id, sortOrder: s.transports.length },
          ],
        }));
        return id;
      },

      updateTransport: (id, patch) => {
        set((s) => ({
          transports: s.transports.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        }));
      },

      removeTransport: (id) => {
        const refs = get().countLegReferences({ transportCatalogId: id });
        if (refs > 0) {
          return { ok: false, reason: `已有 ${refs} 条行程引用，仅除名库藏。` };
        }
        set((s) => ({ transports: s.transports.filter((m) => m.id !== id) }));
        return { ok: true };
      },

      countLegReferences: (ref) => {
        let n = 0;
        for (const tour of get().tours) {
          for (const leg of tour.legs) {
            if (ref.regionId && leg.regionId === ref.regionId) n++;
            if (ref.poiId && leg.poiId === ref.poiId) n++;
            if (ref.mealCatalogId && leg.mealCatalogId === ref.mealCatalogId) n++;
            if (ref.lodgeCatalogId && leg.lodgeCatalogId === ref.lodgeCatalogId) n++;
            if (ref.transportCatalogId && leg.transportCatalogId === ref.transportCatalogId) n++;
          }
        }
        return n;
      },

      replaceAtlasFromBackup: (atlas) => {
        set({
          provinceGroups: atlas.provinceGroups,
          regions: atlas.regions,
          meals: atlas.meals,
          lodges: atlas.lodges,
          transports: atlas.transports,
          atlasSeeded: true,
        });
      },

      replaceToursFromBackup: (tours, activeTourId) => {
        set({ tours, activeTourId });
      },
    }),
    {
      name: "hanling-grand-tour",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        atlasSeeded: s.atlasSeeded,
        provinceGroups: s.provinceGroups,
        regions: s.regions,
        meals: s.meals,
        lodges: s.lodges,
        transports: s.transports,
        tours: s.tours,
        activeTourId: s.activeTourId,
      }),
    }
  )
);

export function buildLegFromCatalog(
  kind: TourItemKind,
  atlas: GrandTourAtlas,
  opts: {
    regionId?: string;
    poiId?: string;
    mealCatalogId?: string;
    lodgeCatalogId?: string;
    transportCatalogId?: string;
  }
): Pick<TourLeg, "title" | "subtitle" | "price" | "transport"> {
  if (kind === "sight" || kind === "ticket") {
    const region = opts.regionId
      ? atlas.regions.find((r) => r.id === opts.regionId)
      : undefined;
    const poi = opts.poiId
      ? region?.pois.find((p) => p.id === opts.poiId)
      : undefined;
    return {
      title: poi?.name ?? "",
      price: poi?.defaultTicketPrice,
    };
  }
  if (kind === "meal" && opts.mealCatalogId) {
    const m = atlas.meals.find((x) => x.id === opts.mealCatalogId);
    if (!m) return { title: "" };
    return {
      title: m.venue,
      subtitle: m.dish,
      price: m.defaultPrice,
    };
  }
  if (kind === "lodge" && opts.lodgeCatalogId) {
    const m = atlas.lodges.find((x) => x.id === opts.lodgeCatalogId);
    if (!m) return { title: "" };
    return { title: m.name, price: m.defaultPrice };
  }
  if (kind === "transport" && opts.transportCatalogId) {
    const m = atlas.transports.find((x) => x.id === opts.transportCatalogId);
    if (!m) return { title: "" };
    return {
      title: `${m.from} → ${m.to}`,
      subtitle: m.vehicle,
      price: m.defaultPrice,
      transport: { from: m.from, to: m.to, vehicle: m.vehicle },
    };
  }
  return { title: "" };
}

