"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Building2,
  Coins,
  Crown,
  Landmark,
  Moon,
  Radio,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getImperialHonorific } from "@/lib/emperor-title";
import { cn } from "@/lib/utils";
import type { City } from "@/store/types";
import { useEmperorStore, useMapStore, useQuestStore } from "@/store";

function sumCpa(cities: City[]): number {
  return cities.reduce((s, c) => s + (Number.isFinite(c.cpa) ? c.cpa : 0), 0);
}

function sumOrders(cities: City[]): number {
  return cities.reduce((s, c) => s + (Number.isFinite(c.orders) ? c.orders : 0), 0);
}

function EmpireBriefingStrip({ className }: { className?: string }) {
  const cities = useMapStore((s) => s.cities);
  const quests = useQuestStore((s) => s.quests);
  const isNomadMode = useEmperorStore((s) => s.isNomadMode);

  const { nCity, nQuest, totalOrders, totalCpa } = useMemo(() => {
    return {
      nCity: cities.length,
      nQuest: quests.length,
      totalOrders: sumOrders(cities),
      totalCpa: sumCpa(cities),
    };
  }, [cities, quests]);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400 sm:text-xs",
        className
      )}
    >
      <span className="inline-flex items-center gap-1 text-slate-300">
        <Landmark className="h-3.5 w-3.5 shrink-0 text-imperial-gold" />
        疆域 <strong className="tabular-nums text-slate-100">{nCity}</strong> 座
      </span>
      <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
      <span className="inline-flex items-center gap-1 text-slate-300">
        <Radio className="h-3.5 w-3.5 shrink-0 text-imperial-gold" />
        军机 <strong className="tabular-nums text-slate-100">{nQuest}</strong> 务
      </span>
      <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
      <span className="tabular-nums text-slate-400">
        粮饷单 <strong className="text-slate-200">{totalOrders}</strong>
      </span>
      <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
      <span className="tabular-nums text-slate-400">
        度支 Σ <strong className="text-slate-200">{totalCpa}</strong>
      </span>
      {isNomadMode ? (
        <>
          <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
          <span
            className="inline-flex items-center gap-1 rounded border border-imperial-gold/40 bg-imperial-gold/10 px-2 py-0.5 text-[10px] font-medium text-imperial-gold"
            title="移动行宫：军机处 MVA 模板任务功勋 +20%"
          >
            ⛺ 移动行宫
          </span>
        </>
      ) : null}
    </div>
  );
}

export function TreasuryHUD() {
  const exp = useEmperorStore((s) => s.exp);
  const level = useEmperorStore((s) => s.level);
  const gold = useEmperorStore((s) => s.gold);
  const troops = useEmperorStore((s) => s.troops);

  const honor = getImperialHonorific(exp);

  return (
    <TooltipProvider delayDuration={200}>
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md",
          "supports-[backdrop-filter]:bg-background/70"
        )}
      >
        <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
                <Crown className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h1 className="truncate text-base font-semibold tracking-tight text-primary sm:text-lg">
                    {honor.fullTitle}
                  </h1>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Lv.{level} · {exp} 功勋
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 text-imperial-gold" />
                  尊号随功勋晋升 · 当前位阶「{honor.rank}」
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-[1.1] lg:max-w-xl lg:px-2">
              <EmpireBriefingStrip className="w-full" />
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 rounded-md border border-slate-800/90 bg-slate-950/50 px-2.5 py-1.5 text-sm">
                <Coins className="h-4 w-4 text-imperial-gold" aria-hidden />
                <span className="tabular-nums text-foreground">
                  {gold.toLocaleString("zh-CN")}
                </span>
                <span className="text-xs text-muted-foreground">国库</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md border border-slate-800/90 bg-slate-950/50 px-2.5 py-1.5 text-sm">
                <Shield
                  className="h-4 w-4 text-imperial-vermilion"
                  aria-hidden
                />
                <span className="tabular-nums text-foreground">
                  {troops.toLocaleString("zh-CN")}
                </span>
                <span className="text-xs text-muted-foreground">军力</span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10"
                    asChild
                  >
                    <Link href="/settings" aria-label="造办处 (系统配置)">
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  造办处 (系统配置)
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
