"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { buildCourtDispatchDecree } from "@/lib/court-dispatch-log";
import { cn } from "@/lib/utils";
import {
  isCurfewMode,
  isEarlyCourtTaskBlocked,
} from "@/lib/imperial-vitals";
import { ImperialPhysicianReview } from "./imperial-physician-review";
import type { Quest, QuestPeriod } from "@/store/types";
import {
  useEmperorStore,
  useEventStore,
  useMapStore,
  useQuestStore,
} from "@/store";

const PERIODS: QuestPeriod[] = ["早朝", "晌午", "傍晚", "深夜"];

const NONE_CITY = "__none__";

export function QuestEngine({ className }: { className?: string }) {
  const cities = useMapStore((s) => s.cities);
  const quests = useQuestStore((s) => s.quests);
  const activeCityId = useQuestStore((s) => s.activeCityId);
  const setActiveCityId = useQuestStore((s) => s.setActiveCityId);
  const toggleQuest = useQuestStore((s) => s.toggleQuest);
  const addLog = useEventStore((s) => s.addLog);

  const health = useEmperorStore((s) => s.health);
  const stamina = useEmperorStore((s) => s.stamina);
  const isDressed = useEmperorStore((s) => s.isDressed);
  const sleepAtYangxinPalace = useEmperorStore((s) => s.sleepAtYangxinPalace);
  const isNomadMode = useEmperorStore((s) => s.isNomadMode);

  const [clock, setClock] = useState(() => new Date());

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
    return map;
  }, [quests]);

  const periodsToShow = useMemo(
    () => PERIODS.filter((p) => (byPeriod.get(p)?.length ?? 0) > 0),
    [byPeriod]
  );

  const isTaskRowDisabled = (q: Quest) => {
    if (questDisabled) return true;
    if (isEarlyCourtTaskBlocked(stamina, q.period, clock)) return true;
    return false;
  };

  const cityDone = (q: Quest) =>
    activeCity ? activeCity.completedQuestIds.includes(q.id) : false;

  const handleCheckedChange = (q: Quest, next: boolean | "indeterminate") => {
    if (next === "indeterminate") return;
    if (!activeCity) return;
    if (isTaskRowDisabled(q)) return;
    const want = next === true;
    const done = cityDone(q);
    if (want === done) return;
    if (done) {
      toggleQuest(q.id);
      return;
    }
    const ok = toggleQuest(q.id);
    if (!ok) {
      addLog(`体力不足，无法为【${activeCity.alias || activeCity.name}】点卯「${q.title}」。`, "battle", {
        cityName: activeCity.alias?.trim() || activeCity.name,
      });
      return;
    }
    const { message, cityName } = buildCourtDispatchDecree(q, activeCity);
    addLog(message, "decree", { cityName });
  };

  const onSleep = () => {
    sleepAtYangxinPalace();
    addLog("养心殿：圣上安寝，龙体得养。", "treasury");
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-border bg-card/40 lg:border-l-0",
        className
      )}
    >
      <div className="shrink-0 border-b border-border px-4 py-3">
        <h2 className="text-base font-semibold tracking-tight text-primary">
          军机处
        </h2>
        <p className="text-xs text-muted-foreground">
          先定主攻城池 · 按时辰点卯 · 功勋记入圣躬
        </p>
        {isNomadMode ? (
          <p className="mt-1 text-[10px] font-medium text-imperial-gold">
            ⛺ 移动行宫已启：本朝 MVA 军机功勋结算 +20%
          </p>
        ) : null}
      </div>

      <ScrollArea className="h-full min-h-0 flex-1 px-2">
        <div className="space-y-1 py-3 pr-3">
          <div className="mx-2 mb-3 space-y-2 rounded-lg border border-imperial-gold/20 bg-slate-950/50 px-3 py-2.5">
            <Label className="text-[11px] font-medium text-imperial-gold">
              主攻城池
            </Label>
            <Select
              value={activeCityId ?? NONE_CITY}
              onValueChange={(v) =>
                setActiveCityId(v === NONE_CITY ? null : v)
              }
            >
              <SelectTrigger className="h-9 border-imperial-gold/25 bg-slate-900/80 text-sm text-slate-100">
                <SelectValue placeholder="选择城池" />
              </SelectTrigger>
              <SelectContent className="border-imperial-gold/20 bg-slate-950 text-slate-100">
                <SelectItem value={NONE_CITY} className="text-slate-400">
                  （未选定）
                </SelectItem>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.alias?.trim() ? ` · ${c.alias.trim()}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!activeCity && cities.length > 0 ? (
              <p className="text-[11px] leading-snug text-amber-200/90">
                请先选定主攻城池，方可勘合本城军机。
              </p>
            ) : null}
            {cities.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                疆域暂无城池，请至造办处疆域司扩建。
              </p>
            ) : null}
          </div>

          {curfew ? (
            <div className="mx-2 space-y-3 rounded-lg border border-imperial-vermilion/50 bg-imperial-vermilion/10 p-4">
              <p className="text-center text-sm font-medium text-imperial-vermilion">
                宵禁：龙体危殆，军机停摆
              </p>
              <Button
                type="button"
                className="w-full bg-primary text-primary-foreground"
                onClick={onSleep}
              >
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
                      const rowDisabled = isTaskRowDisabled(q);
                      const done = cityDone(q);
                      return (
                        <li key={q.id}>
                          <div
                            className={cn(
                              "flex items-start gap-3 rounded-md px-2 py-2 transition-colors",
                              rowDisabled
                                ? "cursor-not-allowed opacity-50"
                                : "cursor-pointer hover:bg-muted/50",
                              done && !rowDisabled && "opacity-75"
                            )}
                          >
                            <Checkbox
                              id={q.id}
                              checked={done}
                              disabled={rowDisabled}
                              onCheckedChange={(v) => handleCheckedChange(q, v)}
                              className="mt-0.5 border-primary/60 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                            />
                            <Label
                              htmlFor={q.id}
                              className={cn(
                                "flex flex-1 flex-col gap-0.5 text-sm font-normal leading-snug",
                                rowDisabled && "cursor-not-allowed",
                                !rowDisabled && "cursor-pointer",
                                done &&
                                  "text-muted-foreground line-through decoration-muted-foreground/80"
                              )}
                            >
                              <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span>{q.title}</span>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-imperial-gold/90 no-underline">
                                  {done ? "本城已办" : "本城未办"}
                                </span>
                              </span>
                              <span className="text-[10px] text-muted-foreground no-underline">
                                功勋 +{q.expReward} · 体力 −{q.staminaCost}
                              </span>
                            </Label>
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
      </ScrollArea>
      <ImperialPhysicianReview />
    </div>
  );
}
