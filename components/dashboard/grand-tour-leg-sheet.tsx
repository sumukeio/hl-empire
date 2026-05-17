"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { GrandTourRegionTree } from "@/components/dashboard/grand-tour-region-tree";
import { formatTourRegionLabel } from "@/lib/grand-tour-labels";
import {
  allowedPeriodsForNewLeg,
  TOUR_PERIODS,
} from "@/lib/grand-tour-period";
import { cn } from "@/lib/utils";
import {
  buildLegFromCatalog,
  useGrandTourStore,
} from "@/store/grand-tour-store";
import type { TourItemKind, TourLeg } from "@/store/types";

const KINDS: TourItemKind[] = [
  "sight",
  "ticket",
  "meal",
  "lodge",
  "transport",
];

const field =
  "border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45";

export function GrandTourLegSheet({
  open,
  onOpenChange,
  tourId,
  leg,
  defaultDayIndex,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tourId: string;
  leg: TourLeg | null;
  defaultDayIndex: number;
}) {
  const tour = useGrandTourStore((s) => s.tours.find((t) => t.id === tourId));
  const regions = useGrandTourStore((s) => s.regions);
  const meals = useGrandTourStore((s) => s.meals);
  const lodges = useGrandTourStore((s) => s.lodges);
  const transports = useGrandTourStore((s) => s.transports);
  const addLeg = useGrandTourStore((s) => s.addLeg);
  const updateLeg = useGrandTourStore((s) => s.updateLeg);

  const [kind, setKind] = useState<TourItemKind>("sight");
  const [dayIndex, setDayIndex] = useState(defaultDayIndex);
  const [period, setPeriod] = useState<TourLeg["period"]>("早朝");
  const [regionId, setRegionId] = useState<string>("");
  const [poiId, setPoiId] = useState<string>("");
  const [mealCatalogId, setMealCatalogId] = useState<string>("");
  const [lodgeCatalogId, setLodgeCatalogId] = useState<string>("");
  const [transportCatalogId, setTransportCatalogId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    if (!open) return;
    if (leg) {
      setKind(leg.kind);
      setDayIndex(leg.dayIndex);
      setPeriod(leg.period);
      setRegionId(leg.regionId ?? "");
      setPoiId(leg.poiId ?? "");
      setMealCatalogId(leg.mealCatalogId ?? "");
      setLodgeCatalogId(leg.lodgeCatalogId ?? "");
      setTransportCatalogId(leg.transportCatalogId ?? "");
      setTitle(leg.title);
      setSubtitle(leg.subtitle ?? "");
      setPrice(leg.price != null ? String(leg.price) : "");
    } else {
      setKind("sight");
      setDayIndex(defaultDayIndex);
      setPeriod("早朝");
      setRegionId(tour?.primaryRegionId ?? "");
      setPoiId("");
      setMealCatalogId("");
      setLodgeCatalogId("");
      setTransportCatalogId("");
      setTitle("");
      setSubtitle("");
      setPrice("");
    }
  }, [open, leg, defaultDayIndex, tour?.primaryRegionId]);

  const sortOrder = leg?.sortOrder ?? 999;
  const allowedPeriods = useMemo(() => {
    const legs = tour?.legs ?? [];
    if (leg) {
      return allowedPeriodsForNewLeg(
        legs.filter((l) => l.id !== leg.id),
        dayIndex,
        sortOrder
      );
    }
    return allowedPeriodsForNewLeg(legs, dayIndex, sortOrder);
  }, [tour?.legs, leg, dayIndex, sortOrder]);

  const region = regions.find((r) => r.id === regionId);
  const pois = region?.pois ?? [];

  const applyCatalog = () => {
    const atlas = useGrandTourStore.getState();
    const snap = buildLegFromCatalog(kind, atlas, {
      regionId: regionId || undefined,
      poiId: poiId || undefined,
      mealCatalogId: mealCatalogId || undefined,
      lodgeCatalogId: lodgeCatalogId || undefined,
      transportCatalogId: transportCatalogId || undefined,
    });
    if (snap.title) setTitle(snap.title);
    if (snap.subtitle) setSubtitle(snap.subtitle);
    if (snap.price != null) setPrice(String(snap.price));
  };

  const onSave = () => {
    const priceNum =
      price.trim() === ""
        ? undefined
        : Math.max(0, Number.parseFloat(price) || 0);
    const transport =
      kind === "transport" && title.includes("→")
        ? {
            from: title.split("→")[0]?.trim() ?? "",
            to: title.split("→")[1]?.trim() ?? "",
            vehicle: subtitle.trim() || "驿传",
          }
        : undefined;

    const payload = {
      kind,
      dayIndex: Math.max(1, dayIndex),
      period,
      regionId: regionId || undefined,
      poiId: poiId || undefined,
      mealCatalogId: mealCatalogId || undefined,
      lodgeCatalogId: lodgeCatalogId || undefined,
      transportCatalogId: transportCatalogId || undefined,
      title: title.trim() || "未命名",
      subtitle: subtitle.trim() || undefined,
      price: priceNum,
      transport,
    };

    if (leg) {
      updateLeg(tourId, leg.id, payload);
    } else {
      addLeg(tourId, payload);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-imperial-gold">
            {leg ? "修订此程" : "添程"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 overflow-y-auto pb-24">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">程别</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as TourItemKind)}
              >
                <SelectTrigger className={cn("h-9", field)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950">
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {k === "sight"
                        ? "游览"
                        : k === "meal"
                          ? "膳宿"
                          : k === "lodge"
                            ? "驻跸"
                            : k === "transport"
                              ? "驿传"
                              : "门券"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">第几日</Label>
              <Input
                type="number"
                min={1}
                value={dayIndex}
                onChange={(e) =>
                  setDayIndex(Math.max(1, Number.parseInt(e.target.value, 10) || 1))
                }
                className={cn("h-9", field)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">时辰</Label>
            <Select value={period} onValueChange={(v) => setPeriod(v as TourLeg["period"])}>
              <SelectTrigger className={cn("h-9", field)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950">
                {TOUR_PERIODS.map((p) => (
                  <SelectItem
                    key={p}
                    value={p}
                    disabled={!allowedPeriods.includes(p)}
                    className="text-xs"
                  >
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(kind === "sight" || kind === "ticket") && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500">京畿</Label>
                <GrandTourRegionTree
                  variant="picker"
                  selectedRegionId={regionId}
                  onSelectRegion={(id) => {
                    setRegionId(id);
                    setPoiId("");
                  }}
                  maxHeightClassName="max-h-44"
                  defaultOpenMacroId="huabei"
                />
              </div>
              {pois.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-500">胜景 POI</Label>
                  <Select value={poiId} onValueChange={setPoiId}>
                    <SelectTrigger className={cn("h-9", field)}>
                      <SelectValue placeholder="选胜景" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-950">
                      {pois.map((p) => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {kind === "meal" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">常供 · 膳宿</Label>
              <Select
                value={mealCatalogId}
                onValueChange={(v) => {
                  setMealCatalogId(v);
                  setTimeout(applyCatalog, 0);
                }}
              >
                <SelectTrigger className={cn("h-9", field)}>
                  <SelectValue placeholder="从库藏选" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950">
                  {meals.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.venue} · {m.dish}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "lodge" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">常供 · 驻跸</Label>
              <Select
                value={lodgeCatalogId}
                onValueChange={(v) => {
                  setLodgeCatalogId(v);
                  setTimeout(applyCatalog, 0);
                }}
              >
                <SelectTrigger className={cn("h-9", field)}>
                  <SelectValue placeholder="从库藏选" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950">
                  {lodges.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "transport" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500">常供 · 驿传</Label>
              <Select
                value={transportCatalogId}
                onValueChange={(v) => {
                  setTransportCatalogId(v);
                  setTimeout(applyCatalog, 0);
                }}
              >
                <SelectTrigger className={cn("h-9", field)}>
                  <SelectValue placeholder="从库藏选" />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950">
                  {transports.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.from} → {m.to} · {m.vehicle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-imperial-gold/40 text-imperial-gold"
            onClick={applyCatalog}
          >
            自库藏填入
          </Button>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">副题</Label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className={field}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">价银（两）</Label>
            <Input
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={field}
            />
          </div>
        </div>
        <SheetFooter className="border-t border-slate-800 pt-4">
          <Button
            type="button"
            className="bg-imperial-gold/90 text-slate-950 hover:bg-imperial-gold"
            onClick={onSave}
          >
            呈报
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
