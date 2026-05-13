"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Coins,
  Crown,
  Landmark,
  Radio,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

import { EventLogPanel } from "@/components/dashboard/event-log-docket";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { getEmperorTitleProgress } from "@/lib/emperor-title";
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

const vaultBtn =
  "w-full border-imperial-gold/55 bg-imperial-gold/15 text-imperial-gold hover:bg-imperial-gold/28 hover:text-imperial-gold";

export function TreasuryHUD() {
  const exp = useEmperorStore((s) => s.exp);
  const level = useEmperorStore((s) => s.level);
  const gold = useEmperorStore((s) => s.gold);
  const troops = useEmperorStore((s) => s.troops);
  const injectGold = useEmperorStore((s) => s.injectGold);
  const syncGold = useEmperorStore((s) => s.syncGold);
  const [docketOpen, setDocketOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [injectInput, setInjectInput] = useState("");
  const [syncInput, setSyncInput] = useState("");

  useEffect(() => {
    if (!vaultOpen) {
      setInjectInput("");
      setSyncInput("");
    }
  }, [vaultOpen]);

  const titleProgress = useMemo(() => getEmperorTitleProgress(exp), [exp]);
  const { tier, nextTier, pctInCurrentTier, expToNextThreshold, isApex } =
    titleProgress;

  return (
    <TooltipProvider delayDuration={200}>
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md",
          "supports-[backdrop-filter]:bg-background/70",
          "pt-[max(0.75rem,env(safe-area-inset-top))]"
        )}
      >
        <div className="mx-auto max-w-[1600px] px-3 pb-3 pt-0 sm:px-4 sm:pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary">
                <Crown className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground sm:text-sm">
                    位阶「{tier.level}」
                  </span>
                  <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-imperial-gold/95 drop-shadow-[0_0_10px_rgba(212,175,55,0.18)] sm:text-lg">
                    {tier.title}
                  </h1>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    Lv.{level} · 累计 {exp} 功勋
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 align-text-bottom text-imperial-gold/80" />
                  {isApex ? (
                    <>
                      已达当今尊号之巅；位阶「{tier.level}」、尊号{" "}
                      <span className="font-medium text-imperial-gold/90">
                        {tier.title}
                      </span>
                      。
                    </>
                  ) : nextTier && expToNextThreshold != null ? (
                    <>
                      距晋升「
                      <span className="font-medium text-imperial-gold/90">
                        {nextTier.title}
                      </span>
                      」还需{" "}
                      <span className="tabular-nums text-foreground">
                        {expToNextThreshold}
                      </span>{" "}
                      功勋
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-[1.1] lg:max-w-xl lg:px-2">
              <EmpireBriefingStrip className="w-full" />
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Dialog open={vaultOpen} onOpenChange={setVaultOpen}>
                <button
                  type="button"
                  onClick={() => setVaultOpen(true)}
                  className={cn(
                    "flex min-h-[44px] min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-800/90 bg-slate-950/50 px-2.5 py-1.5 text-left text-sm transition-colors",
                    "hover:border-imperial-gold/40 hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-imperial-gold/35"
                  )}
                  title="户部司帑：登记岁入与校准国库"
                  aria-label="打开户部司帑（国库管理）"
                >
                  <Coins className="h-4 w-4 shrink-0 text-imperial-gold" aria-hidden />
                  <span className="tabular-nums text-foreground">
                    {gold.toLocaleString("zh-CN")}
                  </span>
                  <span className="text-xs text-muted-foreground">国库</span>
                </button>
                <DialogContent className="max-w-md border-imperial-gold/20 bg-slate-950 text-slate-100 sm:rounded-lg">
                  <DialogHeader>
                    <DialogTitle className="text-primary">户部司帑</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      登记不固定岁入，或将国库与实存现金对齐。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6 px-1 pb-2 pt-1">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="vault-inject" className="text-xs text-slate-400">
                          入账工资/补贴
                        </Label>
                        <Input
                          id="vault-inject"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          placeholder="银两数额"
                          value={injectInput}
                          onChange={(e) => setInjectInput(e.target.value)}
                          className="border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 focus-visible:ring-imperial-gold/25"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className={vaultBtn}
                        onClick={() => {
                          const n = Math.max(
                            0,
                            Math.floor(Number.parseFloat(injectInput) || 0)
                          );
                          if (n <= 0) return;
                          injectGold(n);
                          setInjectInput("");
                        }}
                      >
                        准奏
                      </Button>
                    </div>
                    <Separator className="bg-imperial-gold/15" />
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="vault-sync" className="text-xs text-slate-400">
                          当前现金实存
                        </Label>
                        <Input
                          id="vault-sync"
                          type="number"
                          inputMode="numeric"
                          min={0}
                          step={1}
                          placeholder="校准为…"
                          value={syncInput}
                          onChange={(e) => setSyncInput(e.target.value)}
                          className="border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 focus-visible:ring-imperial-gold/25"
                        />
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          由于日常生活消耗，建议每周校准一次，确保虚实对齐。
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className={vaultBtn}
                        onClick={() => {
                          const raw = syncInput.trim();
                          if (raw === "") return;
                          const n = Math.floor(Number.parseFloat(syncInput) || 0);
                          if (!Number.isFinite(n)) return;
                          syncGold(Math.max(0, n));
                          setSyncInput("");
                          setVaultOpen(false);
                        }}
                      >
                        校准
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-800/90 bg-slate-950/50 px-2.5 py-1.5 text-sm">
                <Shield
                  className="h-4 w-4 shrink-0 text-imperial-vermilion"
                  aria-hidden
                />
                <span className="tabular-nums text-foreground">
                  {troops.toLocaleString("zh-CN")}
                </span>
                <span className="text-xs text-muted-foreground">军力</span>
              </div>

              <Dialog open={docketOpen} onOpenChange={setDocketOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 border-imperial-vermilion/35 text-imperial-vermilion hover:bg-imperial-vermilion/10"
                    aria-label="八百里加急（邸报）"
                    title="八百里加急（邸报）"
                  >
                    <ScrollText className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[min(85dvh,32rem)] w-[min(24rem,calc(100vw-2rem))] max-w-lg gap-0 overflow-hidden p-0 sm:rounded-lg">
                  <DialogHeader className="sr-only">
                    <DialogTitle>八百里加急</DialogTitle>
                    <DialogDescription>邸报列表；军机勘合可逐条撤回并回滚体力与功勋</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[min(85dvh,32rem)] overflow-y-auto p-4">
                    <EventLogPanel className="border-0 shadow-none" />
                  </div>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10"
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

          <div className="mt-3 border-t border-border/50 pt-3">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground sm:text-[11px]">
              <span className="font-medium text-muted-foreground/90">
                位阶内进度
              </span>
              <span className="tabular-nums text-foreground/90">
                {isApex ? (
                  <>已满阶 · {exp.toLocaleString("zh-CN")} 功勋</>
                ) : titleProgress.nextThreshold != null ? (
                  <>
                    {exp.toLocaleString("zh-CN")} /{" "}
                    {titleProgress.nextThreshold.toLocaleString("zh-CN")} 功勋（
                    {pctInCurrentTier}%）
                  </>
                ) : null}
              </span>
            </div>
            <Progress
              value={isApex ? 100 : pctInCurrentTier}
              className="h-2 border border-imperial-gold/15 bg-slate-900/70"
              indicatorClassName="bg-gradient-to-r from-amber-800/95 via-imperial-gold to-amber-600/90"
            />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
