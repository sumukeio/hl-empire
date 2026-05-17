"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { GrandTourLegSheet } from "@/components/dashboard/grand-tour-leg-sheet";
import { Button } from "@/components/ui/button";
import { formatTaels } from "@/lib/grand-tour-ledger";
import { TOUR_ITEM_KIND_LABEL } from "@/lib/grand-tour-labels";
import {
  legIdsWithChronologyWarning,
  legsForDay,
  maxDayIndex,
} from "@/lib/grand-tour-period";
import { cn } from "@/lib/utils";
import { useGrandTourStore } from "@/store/grand-tour-store";
import type { GrandTour, TourLeg } from "@/store/types";

const kindBar: Record<TourLeg["kind"], string> = {
  sight: "border-l-imperial-gold",
  ticket: "border-l-imperial-vermilion",
  meal: "border-l-emerald-500",
  lodge: "border-l-indigo-400",
  transport: "border-l-amber-500",
};

export function GrandTourItinerary({ tour }: { tour: GrandTour }) {
  const removeLeg = useGrandTourStore((s) => s.removeLeg);
  const duplicateLeg = useGrandTourStore((s) => s.duplicateLeg);
  const reorderLegsInDay = useGrandTourStore((s) => s.reorderLegsInDay);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editLeg, setEditLeg] = useState<TourLeg | null>(null);
  const [addDay, setAddDay] = useState(1);
  const [dragId, setDragId] = useState<string | null>(null);

  const readOnly = tour.status === "archived";
  const days = useMemo(() => {
    const max = maxDayIndex(tour.legs);
    return Array.from({ length: max }, (_, i) => i + 1);
  }, [tour.legs]);

  const warnings = useMemo(
    () => legIdsWithChronologyWarning(tour.legs),
    [tour.legs]
  );

  const openAdd = (dayIndex: number) => {
    setEditLeg(null);
    setAddDay(dayIndex);
    setSheetOpen(true);
  };

  const openEdit = (leg: TourLeg) => {
    setEditLeg(leg);
    setAddDay(leg.dayIndex);
    setSheetOpen(true);
  };

  const onDrop = useCallback(
    (e: React.DragEvent, targetId: string, dayIndex: number) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("text/plain");
      const dragLegId = raw || dragId;
      setDragId(null);
      if (!dragLegId || dragLegId === targetId) return;
      const inDay = legsForDay(tour.legs, dayIndex);
      const ordered = inDay.map((l) => l.id);
      const from = ordered.indexOf(dragLegId);
      const to = ordered.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const next = [...ordered];
      next.splice(from, 1);
      next.splice(to, 0, dragLegId);
      reorderLegsInDay(tour.id, dayIndex, next);
    },
    [dragId, tour.id, tour.legs, reorderLegsInDay]
  );

  return (
    <div className="space-y-4">
      {days.map((dayIndex) => {
        const dayLegs = legsForDay(tour.legs, dayIndex);
        return (
          <section
            key={dayIndex}
            className="rounded-lg border border-slate-800/90 bg-slate-950/40"
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 px-3 py-2">
              <h3 className="text-sm font-medium text-imperial-gold/90">
                第 {dayIndex} 日
              </h3>
              {!readOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[11px] text-imperial-gold hover:bg-imperial-gold/10"
                  onClick={() => openAdd(dayIndex)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  本日添程
                </Button>
              )}
            </div>
            <ul className="divide-y divide-slate-800/60 p-1">
              {dayLegs.length === 0 ? (
                <li className="py-6 text-center text-xs text-slate-500">
                  本日尚无程目
                </li>
              ) : (
                dayLegs.map((leg) => (
                  <li
                    key={leg.id}
                    draggable={!readOnly}
                    onDragStart={(e) => {
                      setDragId(leg.id);
                      e.dataTransfer.setData("text/plain", leg.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, leg.id, dayIndex)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "flex items-start gap-2 rounded-md border-l-4 px-2 py-2.5",
                      kindBar[leg.kind],
                      warnings.has(leg.id) && "bg-amber-950/20"
                    )}
                  >
                    {!readOnly && (
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-slate-600" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        <span className="rounded border border-slate-700/80 px-1.5 py-0.5">
                          {leg.period}
                        </span>
                        <span>{TOUR_ITEM_KIND_LABEL[leg.kind]}</span>
                        {warnings.has(leg.id) && (
                          <span className="text-amber-400">序时待勘</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-slate-100">
                        {leg.title}
                        {leg.subtitle ? (
                          <span className="font-normal text-slate-400">
                            {" "}
                            · {leg.subtitle}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <span className="shrink-0 tabular-nums text-xs text-imperial-gold/90">
                      {leg.price != null ? `${formatTaels(leg.price)} 两` : "—"}
                    </span>
                    {!readOnly && (
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500"
                          onClick={() => openEdit(leg)}
                          aria-label="修订"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500"
                          onClick={() => duplicateLeg(tour.id, leg.id)}
                          aria-label="复制此程"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-imperial-vermilion"
                          onClick={() => removeLeg(tour.id, leg.id)}
                          aria-label="除名"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}

      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-imperial-gold/40 text-imperial-gold"
          onClick={() => openAdd(maxDayIndex(tour.legs))}
        >
          <Plus className="mr-2 h-4 w-4" />
          添程（默认最后一日）
        </Button>
      )}

      <GrandTourLegSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        tourId={tour.id}
        leg={editLeg}
        defaultDayIndex={addDay}
      />
    </div>
  );
}
