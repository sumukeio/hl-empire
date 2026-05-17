"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { buildGrandTourRegionHierarchy } from "@/lib/grand-tour-region-hierarchy";
import { formatTourRegionLabel } from "@/lib/grand-tour-labels";
import { cn } from "@/lib/utils";
import { useGrandTourStore } from "@/store/grand-tour-store";
import type { TourRegion } from "@/store/types";

function toggleKey(
  map: Record<string, boolean>,
  key: string
): Record<string, boolean> {
  return { ...map, [key]: !map[key] };
}

export function GrandTourRegionTree({
  selectedRegionId,
  onSelectRegion,
  variant = "picker",
  className,
  maxHeightClassName = "max-h-52",
  defaultOpenMacroId = "huabei",
  atlasExpandedRegionId = null,
  onAtlasExpandRegion,
  renderRegionDetail,
}: {
  selectedRegionId?: string;
  onSelectRegion?: (regionId: string, region: TourRegion) => void;
  variant?: "picker" | "atlas";
  className?: string;
  maxHeightClassName?: string;
  defaultOpenMacroId?: string;
  atlasExpandedRegionId?: string | null;
  onAtlasExpandRegion?: (regionId: string | null) => void;
  renderRegionDetail?: (region: TourRegion) => ReactNode;
}) {
  const provinceGroups = useGrandTourStore((s) => s.provinceGroups);
  const regions = useGrandTourStore((s) => s.regions);

  const hierarchy = useMemo(
    () => buildGrandTourRegionHierarchy(provinceGroups, regions),
    [provinceGroups, regions]
  );

  const [openMacro, setOpenMacro] = useState<Record<string, boolean>>({
    [defaultOpenMacroId]: true,
  });
  const [openProvince, setOpenProvince] = useState<Record<string, boolean>>({
    "prov-0": true,
  });

  return (
    <div
      className={cn(
        "space-y-1 overflow-y-auto rounded-md border border-slate-800/80 bg-slate-950/30 pr-1",
        maxHeightClassName,
        className
      )}
    >
      {hierarchy.map((macro) => {
        const macroOpen = openMacro[macro.id] ?? false;
        return (
          <div key={macro.id} className="rounded-md border border-slate-800/60">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm font-semibold text-imperial-gold/95 hover:bg-slate-900/50"
              onClick={() => setOpenMacro((m) => toggleKey(m, macro.id))}
            >
              {macroOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
              )}
              {macro.name}
              <span className="text-[10px] font-normal text-slate-500">
                {macro.provinces.length} 省
              </span>
            </button>
            {macroOpen && (
              <ul className="border-t border-slate-800/50 pb-1 pl-1">
                {macro.provinces.map((prov) => {
                  const provOpen = openProvince[prov.id] ?? false;
                  return (
                    <li key={prov.id} className="mt-0.5">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-slate-300 hover:bg-slate-900/40"
                        onClick={() =>
                          setOpenProvince((m) => toggleKey(m, prov.id))
                        }
                      >
                        {provOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
                        )}
                        {prov.name}
                        <span className="text-[10px] font-normal text-slate-600">
                          {prov.regions.length}
                        </span>
                      </button>
                      {provOpen && (
                        <ul className="ml-4 border-l border-slate-800/60 pb-1">
                          {prov.regions.map((region) => {
                            const selected =
                              variant === "picker" &&
                              selectedRegionId === region.id;
                            const expanded =
                              variant === "atlas" &&
                              atlasExpandedRegionId === region.id;
                            return (
                              <li key={region.id} className="pl-2">
                                <button
                                  type="button"
                                  className={cn(
                                    "w-full rounded px-2 py-1.5 text-left text-[11px] transition-colors",
                                    selected || expanded
                                      ? "bg-imperial-gold/15 text-imperial-gold"
                                      : "text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                                  )}
                                  onClick={() => {
                                    if (variant === "picker") {
                                      onSelectRegion?.(region.id, region);
                                      return;
                                    }
                                    onAtlasExpandRegion?.(
                                      expanded ? null : region.id
                                    );
                                  }}
                                >
                                  {formatTourRegionLabel(region)}
                                </button>
                                {variant === "atlas" &&
                                  expanded &&
                                  renderRegionDetail?.(region)}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
