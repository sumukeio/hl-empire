"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";
import { buildCourtDispatchDecree } from "@/lib/court-dispatch-log";
import { useIsLgScreen } from "@/lib/use-is-lg";
import { cn } from "@/lib/utils";
import {
  isCurfewMode,
  isEarlyCourtTaskBlocked,
} from "@/lib/imperial-vitals";
import { ImperialPhysicianReview } from "./imperial-physician-review";
import type { City, Quest, QuestPeriod } from "@/store/types";
import {
  useEmperorStore,
  useEventStore,
  useMapStore,
  useQuestStore,
  getQuestDailyCount,
  isQuestFullyCompletedToday,
  DOPAMINE_ENERGY_PER_TICKET,
  QUEST_TIMER_CANCEL_WINDOW_MS,
  QUEST_TIMER_MAX_PAUSE_MS,
  getQuestTimerEffectiveElapsedMs,
  getQuestTimerPauseBudgetUsedMs,
  type ActiveQuestTimer,
} from "@/store";

const PERIODS: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

const NONE_CITY = "__none__";

/** 预计耗时展示（分钟 / 整小时） */
function formatQuestDurationMinutes(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "🕒 —";
  if (m >= 60 && m % 60 === 0) return `🕒 ${m / 60}h`;
  if (m >= 60) {
    const h = m / 60;
    const rounded = Math.round(h * 10) / 10;
    return `🕒 ${String(rounded).replace(/\.0$/, "")}h`;
  }
  return `🕒 ${Math.round(m)}m`;
}

/** 功勋与翻牌券折算（每 15 功勋 ≈ 1 券） */
function formatMeritLineWithTicket(exp: number): string {
  if (exp <= 0) return "功勋 +0";
  const t = exp / DOPAMINE_ENERGY_PER_TICKET;
  const ticketLabel =
    t >= 1 && Math.abs(t - Math.round(t)) < 1e-6
      ? `${Math.round(t)} 券`
      : `${Math.round(t * 10) / 10} 券`.replace(/\.0$/, "");
  return `功勋 +${exp}（${ticketLabel}）`;
}

function formatMmSsFromElapsed(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatPauseBudgetLine(timer: ActiveQuestTimer, now: number): string {
  const used = getQuestTimerPauseBudgetUsedMs(timer, now);
  return `暂停 ${formatMmSsFromElapsed(used)} / 02:00`;
}

function cityMatchesSearch(c: City, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const blob = `${c.name} ${c.alias?.trim() ?? ""}`.toLowerCase();
  return blob.includes(q);
}

export function QuestEngine({
  className,
  embedInBottomSheet,
}: {
  className?: string;
  /** 底栏全屏 Sheet：由外层统一纵向滚动，避免嵌套 Radix ScrollArea 在 iOS 上无法滑动 */
  embedInBottomSheet?: boolean;
}) {
  const cities = useMapStore((s) => s.cities);
  const quests = useQuestStore((s) => s.quests);
  const activeCityId = useQuestStore((s) => s.activeCityId);
  const activeTimer = useQuestStore((s) => s.activeTimer);
  const setActiveCityId = useQuestStore((s) => s.setActiveCityId);
  const toggleQuest = useQuestStore((s) => s.toggleQuest);
  const completeQuestWithTimer = useQuestStore((s) => s.completeQuestWithTimer);
  const completeQuestWithSopOptimize = useQuestStore(
    (s) => s.completeQuestWithSopOptimize
  );
  const cancelActiveQuestTimer = useQuestStore((s) => s.cancelActiveQuestTimer);
  const toggleActiveQuestTimerPause = useQuestStore(
    (s) => s.toggleActiveQuestTimerPause
  );
  const addLog = useEventStore((s) => s.addLog);

  const health = useEmperorStore((s) => s.health);
  const stamina = useEmperorStore((s) => s.stamina);
  const dopaminePool = useEmperorStore((s) => s.dopaminePool);
  const isDressed = useEmperorStore((s) => s.isDressed);
  const sleepAtYangxinPalace = useEmperorStore((s) => s.sleepAtYangxinPalace);
  const isNomadMode = useEmperorStore((s) => s.isNomadMode);

  const [clock, setClock] = useState(() => new Date());
  const [timerTick, setTimerTick] = useState(() => Date.now());
  const [cityDrawerOpen, setCityDrawerOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [sopTarget, setSopTarget] = useState<Quest | null>(null);
  const isLg = useIsLgScreen();

  const activeCity = useMemo(
    () => cities.find((c) => c.id === activeCityId) ?? null,
    [cities, activeCityId]
  );

  useEffect(() => {
    if (activeCityId && !cities.some((c) => c.id === activeCityId)) {
      setActiveCityId(null);
    }
  }, [activeCityId, cities, setActiveCityId]);

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeTimer) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      useQuestStore.getState().syncActiveQuestPauseIfExhausted();
      setTimerTick(now);
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeTimer]);

  useEffect(() => {
    if (!cityDrawerOpen) setCitySearch("");
  }, [cityDrawerOpen]);

  const filteredCities = useMemo(
    () => cities.filter((c) => cityMatchesSearch(c, citySearch)),
    [cities, citySearch]
  );

  /** 列表展示：筛选结果；若当前主攻城被筛掉，仍置顶保留一条以免 Select 失配 */
  const citiesForPicker = useMemo(() => {
    if (!activeCity || filteredCities.some((c) => c.id === activeCity.id)) {
      return filteredCities;
    }
    return [activeCity, ...filteredCities];
  }, [activeCity, filteredCities]);

  const curfew = isCurfewMode(health);
  const protocolLock = !isDressed;
  const questDisabled = curfew || protocolLock || !activeCity;

  const byPeriod = useMemo(() => {
    const map = new Map<QuestPeriod, Quest[]>();
    for (const p of PERIODS) map.set(p, []);
    for (const q of quests) {
      const bucket = map.get(q.period);
      if (bucket) bucket.push(q);
    }
    for (const p of PERIODS) {
      const bucket = map.get(p);
      if (!bucket?.length) continue;
      bucket.sort((a, b) => {
        const d = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (d !== 0) return d;
        return a.id.localeCompare(b.id);
      });
    }
    return map;
  }, [quests]);

  const periodsToShow = useMemo(
    () => PERIODS.filter((p) => (byPeriod.get(p)?.length ?? 0) > 0),
    [byPeriod]
  );

  const absolutePendingCount = useMemo(() => {
    if (!activeCity) return 0;
    return quests.filter(
      (q) =>
        q.compensationType === "absolute" &&
        !isQuestFullyCompletedToday(activeCity, q)
    ).length;
  }, [quests, activeCity]);

  const isRowActionBlocked = (q: Quest) =>
    questDisabled || isEarlyCourtTaskBlocked(stamina, q.period, clock);

  const isAnotherTimerBlocking = (q: Quest) =>
    Boolean(activeTimer && activeTimer.questId !== q.id);

  const cityQuestCount = (q: Quest) =>
    activeCity ? getQuestDailyCount(activeCity, q.id) : 0;
  const cityQuestFull = (q: Quest) =>
    activeCity ? isQuestFullyCompletedToday(activeCity, q) : false;

  const finalizeQuestDecree = (
    q: Quest,
    meta: {
      expGain: number;
      staminaRestored: number;
      tokensMinted: number;
      postDopaminePool: number;
      dopamineExpFed: number;
      dopamineDrained?: number;
      moraleLost?: number;
      healthLost?: number;
    }
  ) => {
    if (!activeCity) return;
    const { message, cityName } = buildCourtDispatchDecree(q, activeCity);
    addLog(message, "decree", {
      cityName,
      revert: {
        kind: "quest_complete",
        cityId: activeCity.id,
        questId: q.id,
        staminaRestored: meta.staminaRestored,
        expSubtracted: meta.expGain,
        tokensSubtracted: meta.tokensMinted,
        postDopaminePool: meta.postDopaminePool,
        dopamineExpFed: meta.dopamineExpFed,
        ...(typeof meta.dopamineDrained === "number" && meta.dopamineDrained > 0
          ? { dopamineDrained: meta.dopamineDrained }
          : {}),
        ...(typeof meta.moraleLost === "number" && meta.moraleLost > 0
          ? { moraleLost: meta.moraleLost }
          : {}),
        ...(typeof meta.healthLost === "number" && meta.healthLost > 0
          ? { healthLost: meta.healthLost }
          : {}),
      },
    });
  };

  const performQuestCompletion = (q: Quest) => {
    if (!activeCity) return;
    if (activeTimer?.questId === q.id) {
      if (isRowActionBlocked(q)) return;
      useQuestStore.getState().syncActiveQuestPauseIfExhausted();
      const max = Math.max(1, q.maxCompletionsPerDay ?? 1);
      const count = getQuestDailyCount(activeCity, q.id);
      if (count >= max) return;
      const r = completeQuestWithTimer(q.id);
      if (r === false) return;
      if (typeof r === "object" && "shoddy" in r && r.shoddy) {
        addLog("【军机处】奏章内容空洞，请重办。", "battle", {
          cityName: activeCity.alias?.trim() || activeCity.name,
        });
        return;
      }
      if (typeof r === "object" && "expGain" in r) {
        finalizeQuestDecree(q, r);
      }
      return;
    }

    if (isRowActionBlocked(q) || isAnotherTimerBlocking(q)) return;
    const max = Math.max(1, q.maxCompletionsPerDay ?? 1);
    const count = getQuestDailyCount(activeCity, q.id);
    if (count >= max) return;

    const result = toggleQuest(q.id);
    if (result === false) {
      addLog(`体力不足，无法为【${activeCity.alias || activeCity.name}】点卯「${q.title}」。`, "battle", {
        cityName: activeCity.alias?.trim() || activeCity.name,
      });
      return;
    }
    if (result === "timer_busy") {
      addLog(
        "【军机处】尚有未呈报之政务在案，请先「呈报奏折」后再点卯他务。",
        "info"
      );
      return;
    }
  };

  const confirmSopOptimize = () => {
    if (!activeCity || !sopTarget) return;
    const q = sopTarget;
    if (activeTimer?.questId !== q.id) return;
    if (isRowActionBlocked(q)) return;
    useQuestStore.getState().syncActiveQuestPauseIfExhausted();
    const meta = completeQuestWithSopOptimize(q.id);
    setSopTarget(null);
    if (meta === false) return;
    finalizeQuestDecree(q, meta);
  };

  const handleCancelQuestTimer = (q: Quest) => {
    const ok = cancelActiveQuestTimer(q.id);
    if (!ok) {
      addLog(
        "【军机处】点卯已过三十息，难以撤回；请呈报奏折或改易方案。",
        "info"
      );
      return;
    }
    addLog("【军机处】已撤本次点卯，体力已退还。", "info");
  };

  const handleToggleQuestPause = (q: Quest) => {
    toggleActiveQuestTimerPause(q.id);
  };

  const onSleep = () => {
    sleepAtYangxinPalace();
    addLog("养心殿：圣上安寝，龙体得养。", "treasury");
  };

  const cityTriggerLabel = !activeCity
    ? "选择主攻城池"
    : `${activeCity.name}${activeCity.alias?.trim() ? ` · ${activeCity.alias.trim()}` : ""}`;

  const cityPickerListScrollClass =
    "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain px-2 py-2 [-webkit-overflow-scrolling:touch]";

  const taskList = (
    <div className="space-y-1 py-3 pr-3">
      <div className="mx-2 mb-3 space-y-2 rounded-lg border border-imperial-gold/20 bg-slate-950/50 px-3 py-2.5">
        <Label className="text-[11px] font-medium text-imperial-gold">主攻城池</Label>
        {isLg ? (
          <div className="space-y-1.5">
            <p className="text-[10px] leading-snug text-muted-foreground">
              展开下方列表后，在列表顶部搜索城名或别名；未展开时输入也会在下拉打开后生效。
            </p>
            <Select
              value={activeCityId ?? NONE_CITY}
              onValueChange={(v) => {
                setActiveCityId(v === NONE_CITY ? null : v);
                setCitySearch("");
              }}
            >
              <SelectTrigger className="h-11 min-h-[44px] border-imperial-gold/25 bg-slate-900/80 text-sm text-slate-100">
                <SelectValue placeholder="选择城池" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(50vh,22rem)] border-imperial-gold/20 bg-slate-950 p-0 text-slate-100">
                <div
                  className="sticky top-0 z-10 border-b border-imperial-gold/20 bg-slate-950 p-2"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <Input
                    type="search"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="搜索城名或别名…"
                    aria-label="在列表内搜索主攻城池"
                    className="h-9 border-imperial-gold/25 bg-slate-900/80 text-sm text-slate-100 placeholder:text-slate-500"
                  />
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    已匹配 {citiesForPicker.length} 座
                    {activeCity &&
                    !filteredCities.some((c) => c.id === activeCity.id) &&
                    citySearch.trim()
                      ? "（含当前主攻）"
                      : ""}
                  </p>
                </div>
                <SelectItem value={NONE_CITY} className="text-slate-400">
                  （未选定）
                </SelectItem>
                {citiesForPicker.length === 0 ? (
                  <SelectItem
                    value="__city_search_empty__"
                    disabled
                    className="cursor-default text-xs text-muted-foreground opacity-80"
                  >
                    无匹配城池，请调整关键词
                  </SelectItem>
                ) : (
                  citiesForPicker.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.alias?.trim() ? ` · ${c.alias.trim()}` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[44px] w-full justify-between border-imperial-gold/25 bg-slate-900/80 px-3 text-left text-sm text-slate-100 hover:bg-slate-900"
              onClick={() => setCityDrawerOpen(true)}
            >
              <span className="truncate">{cityTriggerLabel}</span>
              <span className="shrink-0 text-xs text-muted-foreground">选城</span>
            </Button>
            <Sheet open={cityDrawerOpen} onOpenChange={setCityDrawerOpen}>
              <SheetContent
                side="bottom"
                className="flex max-h-[min(70dvh,28rem)] flex-col gap-0 rounded-t-xl border-t border-imperial-gold/25 p-0"
              >
                <SheetHeader className="shrink-0 space-y-3 border-b border-border px-4 py-3 text-left">
                  <SheetTitle className="text-base text-primary">选择主攻城池</SheetTitle>
                  <Input
                    type="search"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    placeholder="搜索城名或别名…"
                    aria-label="搜索主攻城池"
                    className="h-10 border-imperial-gold/25 bg-slate-900/80 text-sm text-slate-100 placeholder:text-slate-500"
                    autoFocus
                  />
                  <p className="text-[10px] text-muted-foreground">
                    已匹配 {filteredCities.length} 座
                  </p>
                </SheetHeader>
                <div className={cityPickerListScrollClass}>
                  <div className="flex flex-col gap-1 pb-4">
                    <Button
                      type="button"
                      variant={!activeCityId ? "secondary" : "ghost"}
                      className="h-12 min-h-[48px] w-full justify-start text-left text-muted-foreground"
                      onClick={() => {
                        setActiveCityId(null);
                        setCityDrawerOpen(false);
                      }}
                    >
                      （未选定）
                    </Button>
                    {filteredCities.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        无匹配城池，请调整关键词
                      </p>
                    ) : null}
                    {filteredCities.map((c) => {
                      const selected = c.id === activeCityId;
                      return (
                        <Button
                          key={c.id}
                          type="button"
                          variant={selected ? "secondary" : "ghost"}
                          className={cn(
                            "h-auto min-h-[48px] w-full flex-col items-start justify-center gap-0.5 py-2 text-left",
                            selected && "border border-imperial-gold/40 bg-imperial-gold/10"
                          )}
                          onClick={() => {
                            setActiveCityId(c.id);
                            setCityDrawerOpen(false);
                          }}
                        >
                          <span className="font-medium text-foreground">{c.name}</span>
                          {c.alias?.trim() ? (
                            <span className="text-xs text-muted-foreground">{c.alias.trim()}</span>
                          ) : null}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
        {!activeCity && cities.length > 0 ? (
          <p className="text-[11px] leading-snug text-amber-200/90">
            请先选定主攻城池，方可勘合本城军机。
          </p>
        ) : null}
        {cities.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            图志暂无征战目标，请至造办处图志司扩建。
          </p>
        ) : null}
      </div>

      {curfew ? (
        <div className="mx-2 space-y-3 rounded-lg border border-imperial-vermilion/50 bg-imperial-vermilion/10 p-4">
          <p className="text-center text-sm font-medium text-imperial-vermilion">宵禁：龙体危殆，军机停摆</p>
          <Button type="button" className="w-full bg-primary text-primary-foreground" onClick={onSleep}>
            前往养心殿（睡觉）
          </Button>
        </div>
      ) : quests.length === 0 ? (
        <p className="px-3 py-8 text-center text-xs leading-relaxed text-muted-foreground">
          暂无军机任务。请点击顶部「造办处」齿轮 → 枢密院 → 新增任务。
        </p>
      ) : !activeCity ? (
        <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground">
          点卯前请先于上方选择主攻城池。
        </p>
      ) : (
        periodsToShow.map((period) => {
          const list = byPeriod.get(period) ?? [];
          if (!list.length) return null;
          return (
            <div key={period} className="space-y-2 pb-2">
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-imperial-gold">
                  {period}
                </span>
                <Separator className="flex-1 bg-border/80" />
              </div>
              <ul className="space-y-1">
                {list.map((q) => {
                  const rowMuted =
                    isRowActionBlocked(q) || isAnotherTimerBlocking(q);
                  const max = Math.max(1, q.maxCompletionsPerDay ?? 1);
                  const count = cityQuestCount(q);
                  const doneFull = cityQuestFull(q);
                  const isTimingHere = activeTimer?.questId === q.id;
                  const canStartHere =
                    !doneFull &&
                    !isRowActionBlocked(q) &&
                    !activeTimer &&
                    stamina >= q.staminaCost;
                  const canSubmitHere =
                    isTimingHere && !doneFull && !isRowActionBlocked(q);
                  const actionBusy = canSubmitHere || canStartHere;
                  const displayBase =
                    isNomadMode && q.id.startsWith("quest-mva-")
                      ? Math.round(q.expReward * 1.2)
                      : q.expReward;
                  const agriLvBuff = Math.max(
                    0,
                    Math.min(10, Math.floor(activeCity?.agriLevel ?? 0))
                  );
                  const displayExp = Math.max(
                    0,
                    Math.round(displayBase * (1 + agriLvBuff * 0.05))
                  );
                  const stdMin = Math.max(1, q.minCompletionTime ?? 10);
                  const effectiveMs =
                    isTimingHere && activeTimer
                      ? getQuestTimerEffectiveElapsedMs(
                          activeTimer,
                          timerTick
                        )
                      : 0;
                  const elapsedMin = effectiveMs / 60_000;
                  const timerOverdue = isTimingHere && elapsedMin > stdMin;
                  const timerIsPaused =
                    isTimingHere &&
                    activeTimer != null &&
                    activeTimer.pauseStartedAt != null;
                  const pauseUsedMs =
                    isTimingHere && activeTimer
                      ? getQuestTimerPauseBudgetUsedMs(
                          activeTimer,
                          timerTick
                        )
                      : 0;
                  const pauseBudgetFull =
                    isTimingHere &&
                    activeTimer != null &&
                    pauseUsedMs >= QUEST_TIMER_MAX_PAUSE_MS &&
                    !timerIsPaused;
                  const canCancelTimer =
                    isTimingHere &&
                    activeTimer != null &&
                    timerTick - activeTimer.startTime <=
                      QUEST_TIMER_CANCEL_WINDOW_MS;
                  const timerLiveLabel = `计时中: ${formatMmSsFromElapsed(effectiveMs)}${
                    timerIsPaused ? " · 暂停中" : ""
                  }`;
                  const dopPoolFloor = Math.max(
                    0,
                    Math.min(14, Math.floor(dopaminePool))
                  );
                  const showEmptyPoolWarning =
                    isTimingHere && timerOverdue && dopPoolFloor === 0;

                  let actionLabel =
                    q.occurrence === "one_time" && doneFull
                      ? "已建功"
                      : q.occurrence === "daily_once" && doneFull
                        ? "已点卯"
                        : doneFull
                          ? "本日已办满"
                          : count > 0
                            ? "再办一次"
                            : "点卯";
                  if (isTimingHere) {
                    actionLabel = "呈报奏折";
                  }

                  return (
                    <li key={q.id}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2 py-2 transition-colors",
                          rowMuted && "opacity-50",
                          !rowMuted && "hover:bg-muted/40"
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm leading-snug">
                            <span
                              className={cn(
                                "font-medium text-foreground",
                                doneFull &&
                                  "text-muted-foreground line-through decoration-muted-foreground/80"
                              )}
                            >
                              {q.title}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wide text-imperial-gold/90">
                              {doneFull
                                ? `本城已办满（${max}/${max}）`
                                : count > 0
                                  ? `本城已办 ${count}/${max}`
                                  : max > 1
                                    ? `本城未办（0/${max}）`
                                    : "本城未办"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge
                              variant="secondary"
                              className="h-5 px-1.5 text-[10px] font-normal tabular-nums text-slate-200"
                            >
                              {formatQuestDurationMinutes(
                                q.minCompletionTime ?? 10
                              )}
                            </Badge>
                            {q.compensationType === "absolute" ? (
                              <Badge
                                variant="destructive"
                                className="h-5 px-1.5 text-[10px] font-normal"
                              >
                                不可弥补
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="h-5 border-sky-600/60 bg-sky-950/40 px-1.5 text-[10px] font-normal text-sky-200"
                              >
                                可补办
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatMeritLineWithTicket(displayExp)} · 体力 −
                            {q.staminaCost}
                          </p>
                        </div>
                        <div className="flex max-w-[15rem] shrink-0 flex-col items-end gap-1">
                          {isTimingHere && activeTimer ? (
                            <p className="text-[9px] tabular-nums text-muted-foreground">
                              {formatPauseBudgetLine(activeTimer, timerTick)}
                            </p>
                          ) : null}
                          {showEmptyPoolWarning ? (
                            <p className="max-w-[11rem] animate-pulse text-right text-[9px] font-medium leading-tight text-amber-200/95">
                              蓄池已空，继续超时将损耗民心/健康！
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center justify-end gap-0.5">
                            {isTimingHere ? (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-[10px] text-muted-foreground hover:text-imperial-vermilion"
                                  disabled={!canCancelTimer}
                                  title={
                                    canCancelTimer
                                      ? "撤本次点卯并退还体力"
                                      : "仅点卯后三十息内可撤"
                                  }
                                  onClick={() => handleCancelQuestTimer(q)}
                                >
                                  撤点卯
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 min-w-[2.75rem] px-2 text-[10px]"
                                  disabled={pauseBudgetFull}
                                  title={
                                    pauseBudgetFull
                                      ? "累计暂停不得超过 2 分钟"
                                      : timerIsPaused
                                        ? "结束暂停，继续计时"
                                        : "暂停计时（累计至多 2 分钟）"
                                  }
                                  onClick={() => handleToggleQuestPause(q)}
                                >
                                  {timerIsPaused ? "继续" : "暂停"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-9 w-9 border-imperial-gold/40 text-imperial-gold hover:bg-imperial-gold/10"
                                  aria-label="改易方案 (Optimize SOP)"
                                  onClick={() => setSopTarget(q)}
                                >
                                  <Sparkles className="h-4 w-4" />
                                </Button>
                              </>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant={doneFull ? "secondary" : "default"}
                              disabled={!actionBusy}
                              className="h-auto min-h-9 shrink-0 flex-col gap-0 px-3 py-1"
                              onClick={() => performQuestCompletion(q)}
                              aria-label={
                                isTimingHere
                                  ? `${q.title}：呈报奏折 ${timerLiveLabel}`
                                  : `${q.title}：${actionLabel}`
                              }
                            >
                              {isTimingHere ? (
                                <span className="flex flex-col items-center gap-0 leading-tight">
                                  <span className="text-[11px] font-medium">
                                    呈报奏折
                                  </span>
                                  <span
                                    className={cn(
                                      "font-mono text-[10px] tabular-nums",
                                      timerOverdue
                                        ? "text-imperial-vermilion animate-imperial-dopamine-bleed"
                                        : "text-emerald-400"
                                    )}
                                  >
                                    {timerLiveLabel}
                                  </span>
                                </span>
                              ) : (
                                actionLabel
                              )}
                            </Button>
                          </div>
                          {isTimingHere && timerOverdue ? (
                            <p className="max-w-[9.5rem] text-right text-[9px] leading-snug text-imperial-vermilion">
                              多巴胺正在流失…
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-border bg-card/40 lg:border-l-0",
        embedInBottomSheet ? "h-auto shrink-0" : "h-full",
        className
      )}
    >
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight text-primary">
          军机处
        </h2>
        <p className="text-xs text-muted-foreground">
          先定主攻城池 · 点卯启计时 · 三十息内可撤 · 暂停累计至多 2 分钟（不计入用时）· 呈报结算
        </p>
        {isNomadMode ? (
          <p className="mt-1 text-[10px] font-medium text-imperial-gold">
            ⛺ 移动行宫已启：本朝 MVA 军机功勋结算 +20%
          </p>
        ) : null}
        {absolutePendingCount > 0 && activeCity ? (
          <p className="mt-2 text-center text-[11px] font-medium leading-snug text-imperial-vermilion sm:text-left">
            兵贵神速！尚有 {absolutePendingCount}{" "}
            项不可弥补之政务待决。
          </p>
        ) : null}
      </div>

      {embedInBottomSheet ? (
        <div className="touch-pan-y px-2">{taskList}</div>
      ) : (
        <ScrollArea className="h-full min-h-0 flex-1 px-2">{taskList}</ScrollArea>
      )}
      <AlertDialog
        open={sopTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSopTarget(null);
        }}
      >
        <AlertDialogContent className="border-imperial-gold/30 bg-slate-950 text-slate-100 sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-imperial-gold">
              改易方案（Optimize SOP）
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              确认后本次政务不按时长结算；内务府按「功勋基数 × 2」直入多巴胺蓄池（约{" "}
              {sopTarget
                ? Math.max(
                    0,
                    Math.floor(sopTarget.expReward * 2)
                  ).toLocaleString("zh-CN")
                : "—"}{" "}
              点），奏章按改易后程式归档。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border bg-transparent text-slate-200">
              再思量
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-imperial-gold text-slate-950 hover:bg-imperial-gold/90"
              onClick={confirmSopOptimize}
            >
              钦定改易
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ImperialPhysicianReview />
    </div>
  );
}
