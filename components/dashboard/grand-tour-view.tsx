"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, List, Plus } from "lucide-react";

import { GrandTourAtlasPanel } from "@/components/dashboard/grand-tour-atlas-panel";
import { GrandTourItinerary } from "@/components/dashboard/grand-tour-itinerary";
import { GrandTourLedgerPanel } from "@/components/dashboard/grand-tour-ledger-panel";
import { GrandTourRegionTree } from "@/components/dashboard/grand-tour-region-tree";
import { MobileSubpageShell } from "@/components/layout/mobile-subpage-shell";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeTourLedger, formatTaels } from "@/lib/grand-tour-ledger";
import {
  formatTourRegionLabel,
  GRAND_TOUR_STATUS_LABEL,
} from "@/lib/grand-tour-labels";
import { touchInput, touchTarget, touchTargetInline } from "@/lib/mobile-ui";
import { rehydrateAllStores } from "@/store/rehydrate";
import { useGrandTourStore } from "@/store/grand-tour-store";
import type { GrandTour, GrandTourStatus } from "@/store/types";
import { cn } from "@/lib/utils";

const field =
  "border-slate-700/90 bg-slate-900/85 text-slate-100 focus-visible:border-imperial-gold/45";

type TourCatalogProps = {
  tours: GrandTour[];
  activeTour: GrandTour | null;
  newRegionId: string;
  regions: ReturnType<typeof useGrandTourStore.getState>["regions"];
  onSelectRegion: (id: string) => void;
  onSelectTour: (id: string) => void;
  onCreateTour: () => void;
};

function TourCatalogPanel({
  tours,
  activeTour,
  newRegionId,
  regions,
  onSelectRegion,
  onSelectTour,
  onCreateTour,
}: TourCatalogProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          行在目录
        </h2>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("text-imperial-gold", touchTarget)}
          aria-label="下旨新建行在"
          onClick={onCreateTour}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label className="text-[10px] text-slate-500">新建默认京畿</Label>
        <GrandTourRegionTree
          variant="picker"
          selectedRegionId={newRegionId}
          onSelectRegion={onSelectRegion}
          maxHeightClassName="max-h-48"
          defaultOpenMacroId="huabei"
        />
        {newRegionId && regions.some((r) => r.id === newRegionId) ? (
          <p className="text-[10px] text-imperial-gold/80">
            已择：
            {formatTourRegionLabel(regions.find((r) => r.id === newRegionId)!)}
          </p>
        ) : null}
      </div>
      <ul className="max-h-[50vh] space-y-1 overflow-y-auto lg:max-h-[40vh]">
        {tours.length === 0 ? (
          <li className="py-6 text-center text-xs text-slate-500">
            舆图未开，请下旨新建
          </li>
        ) : (
          tours.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={cn(
                  "w-full min-h-[44px] rounded-md px-2 py-2.5 text-left text-xs transition-colors",
                  t.id === activeTour?.id
                    ? "bg-imperial-gold/15 text-imperial-gold"
                    : "text-slate-300 hover:bg-slate-900/80"
                )}
                onClick={() => onSelectTour(t.id)}
              >
                <span className="block truncate font-medium">{t.title}</span>
                <span className="text-[10px] text-slate-500">
                  {GRAND_TOUR_STATUS_LABEL[t.status]}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function GrandTourPageChrome() {
  const [mounted, setMounted] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const ensureAtlasSeed = useGrandTourStore((s) => s.ensureAtlasSeed);
  const tours = useGrandTourStore((s) => s.tours);
  const activeTourId = useGrandTourStore((s) => s.activeTourId);
  const setActiveTourId = useGrandTourStore((s) => s.setActiveTourId);
  const createTour = useGrandTourStore((s) => s.createTour);
  const updateTour = useGrandTourStore((s) => s.updateTour);
  const removeTour = useGrandTourStore((s) => s.removeTour);
  const regions = useGrandTourStore((s) => s.regions);

  const [newRegionId, setNewRegionId] = useState("");

  useEffect(() => {
    void rehydrateAllStores().then(() => {
      useGrandTourStore.persist.rehydrate();
      ensureAtlasSeed();
      setMounted(true);
    });
  }, [ensureAtlasSeed]);

  const activeTour = useMemo(
    () => tours.find((t) => t.id === activeTourId) ?? tours[0] ?? null,
    [tours, activeTourId]
  );

  useEffect(() => {
    if (mounted && tours.length > 0 && !activeTourId) {
      setActiveTourId(tours[0]!.id);
    }
  }, [mounted, tours, activeTourId, setActiveTourId]);

  const ledger = activeTour ? computeTourLedger(activeTour.legs) : null;
  const primaryRegion = activeTour?.primaryRegionId
    ? regions.find((r) => r.id === activeTour.primaryRegionId)
    : undefined;

  const handleCreateTour = () => {
    const id = createTour(newRegionId || undefined);
    setActiveTourId(id);
    setCatalogOpen(false);
  };

  const handleSelectTour = (id: string) => {
    setActiveTourId(id);
    setCatalogOpen(false);
  };

  const catalogPanel = (
    <TourCatalogPanel
      tours={tours}
      activeTour={activeTour}
      newRegionId={newRegionId}
      regions={regions}
      onSelectRegion={setNewRegionId}
      onSelectTour={handleSelectTour}
      onCreateTour={handleCreateTour}
    />
  );

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground supports-[min-height:100dvh]:min-h-[100dvh]">
        展开舆图…
      </div>
    );
  }

  return (
    <MobileSubpageShell
      title="巡游四海"
      subtitle="行在舆图 · 钦定日程"
      icon={<Compass className="h-5 w-5 text-imperial-gold" />}
      maxWidthClass="max-w-6xl"
      headerClassName="border-imperial-gold/25"
      headerExtra={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10 lg:hidden",
            touchTargetInline
          )}
          onClick={() => setCatalogOpen(true)}
        >
          <List className="h-4 w-4" />
          行在目录
        </Button>
      }
      mainClassName="py-4"
    >
      <Sheet open={catalogOpen} onOpenChange={setCatalogOpen}>
        <SheetContent
          side="left"
          className="w-[min(100vw-2rem,320px)] border-imperial-gold/20 bg-slate-950 p-4"
        >
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="text-imperial-gold">行在目录</SheetTitle>
          </SheetHeader>
          {catalogPanel}
        </SheetContent>
      </Sheet>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-lg border border-slate-800/90 bg-slate-950/40 p-3 lg:block">
          {catalogPanel}
        </aside>

        <div className="min-w-0 space-y-4">
          {!activeTour ? (
            <div className="rounded-lg border border-dashed border-imperial-gold/30 py-16 text-center">
              <p className="text-sm text-slate-500">请先下旨新建一行在</p>
              <Button
                type="button"
                className={cn(
                  "mt-4 bg-imperial-gold/90 text-slate-950",
                  touchTargetInline
                )}
                onClick={() => createTour()}
              >
                下旨新建
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-imperial-gold/25 bg-slate-950/50 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <Label className="text-[10px] text-slate-500">行在标题</Label>
                    <Input
                      value={activeTour.title}
                      onChange={(e) =>
                        updateTour(activeTour.id, { title: e.target.value })
                      }
                      disabled={activeTour.status === "archived"}
                      className={cn(field, touchInput)}
                    />
                  </div>
                  <div className="w-full space-y-2 sm:w-32">
                    <Label className="text-[10px] text-slate-500">状态</Label>
                    <Select
                      value={activeTour.status}
                      onValueChange={(v) =>
                        updateTour(activeTour.id, {
                          status: v as GrandTourStatus,
                        })
                      }
                    >
                      <SelectTrigger className={cn(touchInput, field)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-800 bg-slate-950">
                        {(
                          ["draft", "active", "archived"] as GrandTourStatus[]
                        ).map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {GRAND_TOUR_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-full space-y-2 lg:min-w-[14rem] lg:flex-1">
                    <Label className="text-[10px] text-slate-500">主京畿</Label>
                    {activeTour.status === "archived" ? (
                      <p className="text-sm text-slate-300">
                        {primaryRegion
                          ? formatTourRegionLabel(primaryRegion)
                          : "未择"}
                      </p>
                    ) : (
                      <GrandTourRegionTree
                        variant="picker"
                        selectedRegionId={activeTour.primaryRegionId ?? ""}
                        onSelectRegion={(id) =>
                          updateTour(activeTour.id, {
                            primaryRegionId: id,
                          })
                        }
                        maxHeightClassName="max-h-40"
                        defaultOpenMacroId="huabei"
                      />
                    )}
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {primaryRegion
                    ? formatTourRegionLabel(primaryRegion)
                    : "未择京畿"}
                  {ledger ? (
                    <span className="ml-2 text-imperial-gold">
                      · 用度合计 {formatTaels(ledger.total)} 两
                    </span>
                  ) : null}
                </p>
                {activeTour.status !== "archived" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "mt-2 text-[11px] text-imperial-vermilion hover:bg-imperial-vermilion/10",
                      touchTargetInline
                    )}
                    onClick={() => {
                      if (window.confirm("确定除名此行在？")) {
                        removeTour(activeTour.id);
                      }
                    }}
                  >
                    除名此行在
                  </Button>
                )}
              </div>

              <Tabs defaultValue="itinerary" className="w-full">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-slate-900/80 p-1">
                  <TabsTrigger value="itinerary" className={touchTargetInline}>
                    钦定行程
                  </TabsTrigger>
                  <TabsTrigger value="atlas" className={touchTargetInline}>
                    舆图库藏
                  </TabsTrigger>
                  <TabsTrigger value="ledger" className={touchTargetInline}>
                    用度总账
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="itinerary" className="mt-4">
                  <GrandTourItinerary tour={activeTour} />
                </TabsContent>
                <TabsContent value="atlas" className="mt-4">
                  <GrandTourAtlasPanel />
                </TabsContent>
                <TabsContent value="ledger" className="mt-4">
                  <GrandTourLedgerPanel tour={activeTour} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </MobileSubpageShell>
  );
}
