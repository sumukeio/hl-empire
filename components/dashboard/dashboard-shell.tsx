"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { ImperialRedLineWatch } from "./imperial-red-line-watch";
import { NeiwufuCabinet } from "./neiwufu-cabinet";
import { OracleBriefing } from "./oracle-briefing";
import { QuestEngine } from "./quest-engine";
import { TreasuryHUD } from "./treasury-hud";
import { WarMap } from "./war-map";
import { InnerCourtCard } from "@/components/inner-court";
import { useEmperorStore } from "@/store";

export function DashboardShell() {
  const [questOpen, setQuestOpen] = useState(false);
  const [locateCityId, setLocateCityId] = useState<string | null>(null);
  const isDressed = useEmperorStore((s) => s.isDressed);

  return (
    <div className="flex min-h-screen flex-col">
      <ImperialRedLineWatch />
      <TreasuryHUD />

      <div className="mx-auto flex w-full max-w-[1600px] flex-1 min-h-0 flex-col lg:flex-row">
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-24 sm:px-4 lg:pb-4">
          <div className="space-y-6">
            <OracleBriefing onLocateCity={(id) => setLocateCityId(id)} />
            <WarMap
              locateCityId={locateCityId}
              onLocateCityDone={() => setLocateCityId(null)}
              showPajamaOverlay={!isDressed}
            />
          </div>
        </main>

        <aside className="hidden min-h-0 shrink-0 border-l border-border bg-card/20 lg:flex lg:min-w-0 lg:w-[min(42rem,calc(100vw-24rem))] lg:flex-row lg:self-stretch">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-border/80">
            <QuestEngine className="min-h-0 flex-1" />
          </div>
          <div className="flex w-[min(18rem,34vw)] min-w-[15rem] shrink-0 flex-col overflow-hidden border-l border-border/80">
            <InnerCourtCard className="shrink-0 rounded-none border-0 border-b border-border/80 shadow-none" />
            <NeiwufuCabinet className="min-h-0 flex-1 rounded-none border-0 shadow-none" />
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center border-t border-border bg-background/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <Button
          type="button"
          className="w-full max-w-md gap-2 bg-primary/90 text-primary-foreground hover:bg-primary"
          onClick={() => setQuestOpen(true)}
        >
          <ScrollText className="h-4 w-4" />
          军机处 · 养正与宫务
        </Button>
      </div>

      <Sheet open={questOpen} onOpenChange={setQuestOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[min(92dvh,44rem)] flex-col gap-0 rounded-t-xl border-t border-primary/20 p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>军机处 · 养正司与内务府</SheetTitle>
          </SheetHeader>
          <div
            className="flex shrink-0 justify-center pt-3 pb-1"
            aria-hidden
          >
            <div className="h-1 w-10 rounded-full bg-muted-foreground/35" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] touch-pan-y">
            <QuestEngine
              embedInBottomSheet
              className="shrink-0 rounded-none border-0 border-b border-border/60"
            />
            <InnerCourtCard
              embedInBottomSheet
              className="shrink-0 rounded-none border-0 border-b border-border/80 shadow-none"
            />
            <NeiwufuCabinet
              embedInBottomSheet
              className="w-full shrink-0 rounded-none border-0 shadow-none"
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
