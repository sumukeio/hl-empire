"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Building2, Moon, Swords, Ticket, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  CURFEW_HEALTH_THRESHOLD,
  isCurfewMode,
} from "@/lib/imperial-vitals";
import { useEmperorStore, useEventStore, DOPAMINE_ENERGY_PER_TICKET } from "@/store";

const ENTERTAINMENT_MS = 20 * 60 * 1000;

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function NeiwufuCabinet({
  className,
  embedInBottomSheet,
}: {
  className?: string;
  /** 底栏全屏 Sheet：由外层统一纵向滚动，避免嵌套 overflow 在 H5 上无法滑动 */
  embedInBottomSheet?: boolean;
}) {
  const health = useEmperorStore((s) => s.health);
  const martialArts = useEmperorStore((s) => s.martialArts);
  const tokens = useEmperorStore((s) => s.tokens);
  const dopaminePool = useEmperorStore((s) => s.dopaminePool);
  const stamina = useEmperorStore((s) => s.stamina);
  const isDressed = useEmperorStore((s) => s.isDressed);
  const isEntertaining = useEmperorStore((s) => s.isEntertaining);
  const deadline = useEmperorStore((s) => s.entertainmentDeadline);
  const startEntertainment = useEmperorStore((s) => s.startEntertainment);
  const completeEntertainmentSession = useEmperorStore(
    (s) => s.completeEntertainmentSession
  );
  const jungleHunt = useEmperorStore((s) => s.jungleHunt);
  const royalSparring = useEmperorStore((s) => s.royalSparring);
  const sleepAtYangxinPalace = useEmperorStore((s) => s.sleepAtYangxinPalace);
  const setIsDressed = useEmperorStore((s) => s.setIsDressed);
  const dailyReset = useEmperorStore((s) => s.dailyReset);
  const addLog = useEventStore((s) => s.addLog);

  const [now, setNow] = useState(() => Date.now());
  const [showDisrobe, setShowDisrobe] = useState(false);
  const endOnceRef = useRef(false);
  const prevTokensRef = useRef(tokens);
  const [tokenBump, setTokenBump] = useState(false);

  useEffect(() => {
    if (tokens > prevTokensRef.current) {
      setTokenBump(true);
      const t = window.setTimeout(() => setTokenBump(false), 480);
      prevTokensRef.current = tokens;
      return () => window.clearTimeout(t);
    }
    prevTokensRef.current = tokens;
  }, [tokens]);

  const dopamineProgressPct =
    (Math.max(0, Math.min(14, Math.floor(dopaminePool))) /
      DOPAMINE_ENERGY_PER_TICKET) *
    100;

  const curfew = isCurfewMode(health);
  const canAct = !curfew && isDressed && !isEntertaining;
  const healthCrit = health < 30;
  const staminaCrit = stamina < 40;

  const onDailyRest = () => {
    dailyReset();
    addLog("宵禁整顿：体力已回满，三军休整。", "treasury");
  };

  const remainingMs = useMemo(() => {
    if (!isEntertaining || !deadline) return 0;
    return Math.max(0, deadline - now);
  }, [isEntertaining, deadline, now]);

  const elapsedRatio = useMemo(() => {
    if (!isEntertaining || !deadline) return 0;
    const elapsed = ENTERTAINMENT_MS - remainingMs;
    return Math.min(1, Math.max(0, elapsed / ENTERTAINMENT_MS));
  }, [isEntertaining, deadline, remainingMs]);

  const triggerDisrobe = useCallback(() => {
    if (endOnceRef.current) return;
    endOnceRef.current = true;
    completeEntertainmentSession();
    setShowDisrobe(true);
  }, [completeEntertainmentSession]);

  useEffect(() => {
    const ent = useEmperorStore.getState();
    if (
      ent.isEntertaining &&
      ent.entertainmentDeadline &&
      Date.now() >= ent.entertainmentDeadline
    ) {
      triggerDisrobe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时检查是否已超时
  }, []);

  useEffect(() => {
    if (!isEntertaining || !deadline) {
      return;
    }
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= deadline) {
        window.clearInterval(id);
        triggerDisrobe();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [isEntertaining, deadline, triggerDisrobe]);

  const onFlip = () => {
    if (!startEntertainment()) return;
    endOnceRef.current = false;
    setNow(Date.now());
    addLog("内务府：圣上翻牌，御花园计时已启。", "treasury");
  };

  const onHuntJungle = () => {
    if (!jungleHunt()) return;
    addLog("圣上校阅三军，武力大增。", "battle");
  };

  const onSpar = () => {
    if (!royalSparring()) return;
    addLog("圣上校阅三军，武力大增。", "battle");
  };

  const onSleep = () => {
    sleepAtYangxinPalace();
    addLog("养心殿：圣上安寝，龙体得养。", "treasury");
  };

  const onConfirmDisrobe = () => {
    setShowDisrobe(false);
    endOnceRef.current = false;
  };

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-col border-border bg-card/40",
          className
        )}
      >
        <div className="shrink-0 border-b border-border px-3 py-3">
          <h2 className="text-base font-semibold tracking-tight text-primary">
            内务府
          </h2>
          <p className="text-xs text-muted-foreground">
            圣躬 · 御苑 · 校场 — 宫务与命力
          </p>
        </div>

        <div
          className={cn(
            "flex flex-col px-3 py-3",
            embedInBottomSheet
              ? "shrink-0 overflow-visible"
              : "min-h-0 flex-1 overflow-y-auto"
          )}
        >
          <div className="flex flex-col space-y-4">
            <Card className="border-imperial-gold/35 bg-slate-950/45 shadow-sm">
              <CardHeader className="space-y-0.5 px-3 pb-2 pt-3">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-imperial-gold">
                  皇帝圣躬
                </CardTitle>
                <p className="text-[10px] text-muted-foreground">
                  龙体 · 御体 · 武术 · 朝服
                </p>
              </CardHeader>
              <CardContent className="space-y-3 px-3 pb-3 pt-0">
                <div
                  className={cn(
                    "space-y-1.5 rounded-md border border-slate-800/80 bg-slate-900/40 p-2",
                    healthCrit && "animate-imperial-vitals-alert ring-1 ring-imperial-vermilion/50"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
                    <span className="font-medium text-rose-100/90">龙体康健</span>
                    <span className="tabular-nums text-foreground">
                      {health} / 100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 transition-[width] duration-500 ease-out",
                        healthCrit && "shadow-[0_0_10px_rgba(225,29,72,0.45)]"
                      )}
                      style={{ width: `${Math.min(100, health)}%` }}
                    />
                  </div>
                  {healthCrit ? (
                    <p className="text-[10px] font-medium text-imperial-vermilion">
                      龙体危殆，请速往养心殿安寝！
                    </p>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "space-y-1.5 rounded-md border border-slate-800/80 bg-slate-900/40 p-2",
                    staminaCrit &&
                      "animate-imperial-vitals-alert ring-1 ring-imperial-gold/45"
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
                    <span className="font-medium text-imperial-gold/95">
                      御体状态（体力）
                    </span>
                    <span className="tabular-nums text-foreground">
                      {stamina} / 100
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className={cn(
                        "h-full rounded-full bg-gradient-to-r from-amber-800 via-amber-500 to-imperial-gold transition-[width] duration-500 ease-out",
                        staminaCrit && "shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                      )}
                      style={{ width: `${Math.min(100, stamina)}%` }}
                    />
                  </div>
                  {staminaCrit ? (
                    <p className="text-[10px] font-medium text-imperial-gold">
                      体力不济，宜减政息怒，早赴养心殿歇息。
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-2 rounded-md border border-slate-800/80 bg-slate-900/30 px-2 py-1.5">
                  <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-300 sm:text-xs">
                    <Swords className="h-3.5 w-3.5 shrink-0 text-slate-200" />
                    <span className="text-muted-foreground">武术</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-100">
                    {martialArts}
                  </span>
                </div>

                <div className="rounded-md border border-slate-800/90 bg-slate-950/60 px-2 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                      <Moon
                        className={cn(
                          "h-3.5 w-3.5",
                          !isDressed
                            ? "text-imperial-vermilion"
                            : "text-muted-foreground"
                        )}
                      />
                      <span
                        className={cn(!isDressed && "text-imperial-vermilion")}
                      >
                        养心殿
                      </span>
                    </div>
                    <Switch
                      id="neiwufu-dress"
                      checked={isDressed}
                      onCheckedChange={(v) => {
                        setIsDressed(v);
                        addLog(
                          v
                            ? "朝服协议：圣上临宣政殿，可理政。"
                            : "朝服协议：圣上入养心殿（睡衣），九州图志封禁。",
                          "decree"
                        );
                      }}
                      className="data-[state=checked]:bg-imperial-gold"
                      aria-label="朝服协议"
                    />
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground sm:text-xs">
                      <Building2
                        className={cn(
                          "h-3.5 w-3.5",
                          isDressed ? "text-imperial-gold" : "text-muted-foreground"
                        )}
                      />
                      <span className={cn(isDressed && "text-imperial-gold")}>
                        宣政殿
                      </span>
                    </div>
                  </div>
                  <Label htmlFor="neiwufu-dress" className="sr-only">
                    朝服协议：养心殿睡衣 / 宣政殿理政
                  </Label>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full border-slate-700 text-[11px] text-slate-300 hover:bg-slate-800/80"
                  onClick={onDailyRest}
                >
                  宵禁整顿（回满体力）
                </Button>
              </CardContent>
            </Card>

            {curfew ? (
              <div className="space-y-3 rounded-xl border border-imperial-vermilion/50 bg-imperial-vermilion/10 p-4">
                <p className="text-center text-sm font-medium leading-snug text-imperial-vermilion">
                  宵禁：龙体危殆，仅可安寝
                </p>
                <Button
                  type="button"
                  className="w-full bg-primary text-primary-foreground"
                  onClick={onSleep}
                >
                  前往养心殿（睡觉）
                </Button>
              </div>
            ) : (
              <>
                <Card className="border-2 border-imperial-gold/50 bg-imperial-gold/[0.06] shadow-sm">
                  <CardHeader className="space-y-1 px-4 pb-2 pt-4">
                    <CardTitle className="text-sm font-semibold text-imperial-gold">
                      欲望收费站
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 px-4 pb-4 pt-0">
                    <div className="rounded-lg border-2 border-imperial-gold/70 bg-slate-950/40 px-4 py-4 text-center shadow-inner">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-imperial-gold/80">
                        翻牌券
                      </p>
                      <p className="mt-1 flex items-center justify-center gap-2 text-3xl font-bold tabular-nums text-imperial-gold sm:text-4xl">
                        <Ticket className="h-7 w-7 shrink-0 opacity-90 sm:h-8 sm:w-8" />
                        <span
                          className={cn(
                            "inline-block origin-center will-change-transform",
                            tokenBump && "animate-imperial-token-pop"
                          )}
                        >
                          {tokens}
                        </span>
                      </p>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium text-imperial-gold/85">
                            多巴胺蓄池
                          </span>
                          <span className="tabular-nums text-imperial-gold/90">
                            {Math.max(0, Math.min(14, Math.floor(dopaminePool)))} /{" "}
                            {DOPAMINE_ENERGY_PER_TICKET}
                          </span>
                        </div>
                        <Progress
                          value={dopamineProgressPct}
                          className="h-1.5 bg-slate-900/90"
                          indicatorClassName="bg-gradient-to-r from-amber-900/90 via-imperial-gold to-amber-300/95 shadow-[0_0_12px_rgba(245,158,11,0.35)] transition-all duration-500 ease-out"
                        />
                      </div>
                      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
                        军机功勋注入蓄池，每满 {DOPAMINE_ENERGY_PER_TICKET}{" "}
                        点由内务府铸 1 券 · 1 券 = 20 分钟
                      </p>
                    </div>

                    {isEntertaining && deadline ? (
                      <div className="space-y-2 rounded-lg border border-imperial-vermilion/45 bg-imperial-vermilion/10 p-3">
                        <div className="flex items-center justify-between gap-2 text-xs text-imperial-vermilion">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Timer className="h-4 w-4 shrink-0 animate-pulse" />
                            御花园计时
                          </span>
                          <span className="tabular-nums text-sm font-semibold">
                            {formatRemaining(remainingMs)}
                          </span>
                        </div>
                        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-black/40">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-imperial-gold via-amber-400 to-imperial-vermilion transition-[width] duration-1000 ease-linear"
                            style={{
                              width: `${elapsedRatio * 100}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-imperial-vermilion/80">
                          朱条流逝中…
                        </p>
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canAct || tokens < 1}
                      className="h-12 w-full shrink-0 border-2 border-imperial-vermilion/85 text-base text-imperial-vermilion hover:bg-imperial-vermilion/15 disabled:opacity-40"
                      onClick={onFlip}
                    >
                      翻牌子（1 券 · 20 分）
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border/80 bg-background/50 shadow-sm">
                  <CardHeader className="space-y-1 px-4 pb-2 pt-4">
                    <CardTitle className="text-sm font-semibold text-primary">
                      校场狩猎
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canAct || stamina < 20}
                        className="flex h-auto min-h-[6.5rem] flex-col items-center justify-center gap-1.5 whitespace-normal px-2 py-3 text-center"
                        onClick={onHuntJungle}
                      >
                        <span className="text-sm font-semibold leading-tight">
                          丛林围猎
                        </span>
                        <span className="text-[10px] leading-snug text-muted-foreground">
                          深蹲 30
                        </span>
                        <span className="text-[10px] leading-snug text-imperial-gold/95">
                          消耗 20 🔋 | 功勋 +15
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          武术 +5
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canAct || stamina < 15}
                        className="flex h-auto min-h-[6.5rem] flex-col items-center justify-center gap-1.5 whitespace-normal px-2 py-3 text-center"
                        onClick={onSpar}
                      >
                        <span className="text-sm font-semibold leading-tight">
                          御前比武
                        </span>
                        <span className="text-[10px] leading-snug text-muted-foreground">
                          俯卧撑 20
                        </span>
                        <span className="text-[10px] leading-snug text-imperial-gold/95">
                          消耗 15 🔋 | 功勋 +10
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          武术 +3
                        </span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {health < 50 && health >= CURFEW_HEALTH_THRESHOLD ? (
                  <p className="text-center text-[10px] leading-relaxed text-amber-500/90">
                    健康不足 50 时开启娱乐，每轮结束额外扣除 5 点健康。
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      {showDisrobe ? (
        <div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-6 bg-black/95 p-6 text-center"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="disrobe-title"
        >
          <h2
            id="disrobe-title"
            className="max-w-md text-2xl font-bold tracking-wide text-imperial-vermilion sm:text-3xl"
          >
            时辰已到，请圣上卸甲退朝。
          </h2>
          <p className="max-w-sm text-sm text-slate-400">
            界面已锁定，请确认后继续理政。
          </p>
          <Button
            type="button"
            size="lg"
            className="min-h-[48px] min-w-[200px] bg-imperial-vermilion text-white hover:bg-imperial-vermilion/90"
            onClick={onConfirmDisrobe}
          >
            确认退朝
          </Button>
        </div>
      ) : null}
    </>
  );
}
