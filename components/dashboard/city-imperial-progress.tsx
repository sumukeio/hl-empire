"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Coins, Shield, Sprout } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { cityStatusProgressTone } from "@/lib/city-status";
import {
  industryExpNeededForNext,
  industryProgressPercent,
  vassalCityDailyTribute,
} from "@/lib/city-industry";
import {
  computeImperialAxisProgress,
  questsForImperialAxis,
  type ImperialAxis,
} from "@/lib/quest-imperial-axis";
import {
  getQuestDailyCount,
  isQuestFullyCompletedToday,
} from "@/store";
import type { City, CityStatus, Quest } from "@/store/types";

function formatCompletedAt(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function clampLv(n: number): number {
  return Math.max(0, Math.min(10, Math.floor(Number.isFinite(n) ? n : 0)));
}

export type CityImperialProgressProps = {
  city: City;
  quests: Quest[];
  /** 与奏折内「征战态势」草稿一致，便于预览色调。 */
  statusTone: CityStatus;
  className?: string;
};

export function CityImperialProgress({
  city,
  quests,
  statusTone,
  className,
}: CityImperialProgressProps) {
  const [openAxis, setOpenAxis] = useState<ImperialAxis | null>(null);
  const slices = useMemo(
    () =>
      computeImperialAxisProgress(quests, (q) =>
        isQuestFullyCompletedToday(city, q)
      ),
    [quests, city]
  );
  const tone = cityStatusProgressTone(statusTone);

  const agriLv = clampLv(city.agriLevel ?? 0);
  const commLv = clampLv(city.commLevel ?? 0);
  const secuLv = clampLv(city.secuLevel ?? 0);
  const agriExp = Math.max(0, Math.floor(city.agriExp ?? 0));
  const commExp = Math.max(0, Math.floor(city.commExp ?? 0));
  const secuExp = Math.max(0, Math.floor(city.secuExp ?? 0));

  const agriNeed = agriLv >= 10 ? null : industryExpNeededForNext(agriLv);
  const commNeed = commLv >= 10 ? null : industryExpNeededForNext(commLv);
  const secuNeed = secuLv >= 10 ? null : industryExpNeededForNext(secuLv);

  const meritBonusPct = agriLv * 5;
  const vassalDailySilver = vassalCityDailyTribute(city);

  return (
    <div
      className={cn(
        "rounded-lg border border-imperial-gold/15 bg-slate-900/50 px-3 py-3",
        className
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-imperial-gold">
          建设进度
        </h3>
        <span className="text-[10px] text-slate-500">产业 · 四部政务</span>
      </div>

      <div className="mb-3 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-200/95">
              <Sprout className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
              农业 Lv.{agriLv}
            </span>
            <span className="tabular-nums text-slate-500">
              {agriNeed != null ? `${agriExp} / ${agriNeed}` : "已满级"}
            </span>
          </div>
          <Progress
            value={industryProgressPercent(agriLv, agriExp)}
            className="h-1.5 bg-emerald-950/80"
            indicatorClassName="bg-gradient-to-r from-emerald-900 via-emerald-500 to-lime-400 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
            <span className="inline-flex items-center gap-1 font-medium text-imperial-gold/95">
              <Coins className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
              商业 Lv.{commLv}
            </span>
            <span className="tabular-nums text-slate-500">
              {commNeed != null ? `${commExp} / ${commNeed}` : "已满级"}
            </span>
          </div>
          <Progress
            value={industryProgressPercent(commLv, commExp)}
            className="h-1.5 bg-amber-950/70"
            indicatorClassName="bg-gradient-to-r from-amber-950 via-imperial-gold to-amber-300/90 shadow-[0_0_10px_rgba(245,158,11,0.28)]"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-300">
            <span className="inline-flex items-center gap-1 font-medium text-indigo-200/95">
              <Shield className="h-3.5 w-3.5 shrink-0 text-indigo-400" aria-hidden />
              治安 Lv.{secuLv}
            </span>
            <span className="tabular-nums text-slate-500">
              {secuNeed != null ? `${secuExp} / ${secuNeed}` : "已满级"}
            </span>
          </div>
          <Progress
            value={industryProgressPercent(secuLv, secuExp)}
            className="h-1.5 bg-indigo-950/80"
            indicatorClassName="bg-gradient-to-r from-indigo-950 via-indigo-500 to-sky-400/90 shadow-[0_0_10px_rgba(99,102,241,0.3)]"
          />
        </div>

        <p className="text-[9px] leading-snug text-slate-400">
          当前加成：在本城点卯军机时，功勋获取{" "}
          <span className="font-medium text-emerald-300/90">+{meritBonusPct}%</span>
          （农业政绩）。
          {city.status === 3 ? (
            <>
              本藩属预计每日进贡{" "}
              <span className="font-medium text-imperial-gold/90 tabular-nums">
                +{vassalDailySilver}
              </span>{" "}
              两（跨日「藩属进贡」按商业等级汇总入户部）。
            </>
          ) : (
            <>
              升为金色藩属后，商业等级将按日折算为「藩属进贡」白银。
            </>
          )}
        </p>
        <p className="text-[9px] leading-snug text-slate-600">
          治安等级将用于后续「恶意点击」等事件中国库损失的减免（预留）。
        </p>
      </div>

      <Separator className="mb-2 bg-imperial-gold/15" />

      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-slate-500">四部政务</span>
        <span className="text-[10px] text-slate-500">点按下钻</span>
      </div>
      <ul className="space-y-2">
        {slices.map((row) => {
          const axisQuests = questsForImperialAxis(quests, row.axis);
          const expanded = openAxis === row.axis;
          return (
            <li key={row.axis}>
              <button
                type="button"
                onClick={() => setOpenAxis(expanded ? null : row.axis)}
                className="flex w-full flex-col gap-1 rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-800/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-200">
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-imperial-gold" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    )}
                    {row.label}
                  </span>
                  <span className="tabular-nums text-[10px] text-slate-400">
                    {row.total === 0
                      ? "—"
                      : `${row.done}/${row.total} · ${row.pct}%`}
                  </span>
                </div>
                <Progress
                  value={row.total === 0 ? 0 : row.pct}
                  className={cn("h-1.5", tone.track)}
                  indicatorClassName={tone.indicator}
                />
              </button>
              {expanded && axisQuests.length > 0 ? (
                <ul className="ml-5 mt-1 space-y-1 border-l border-slate-700/80 pb-1 pl-2">
                  {axisQuests.map((q) => {
                    const max = Math.max(1, q.maxCompletionsPerDay ?? 1);
                    const count = getQuestDailyCount(city, q.id);
                    const full = isQuestFullyCompletedToday(city, q);
                    const at = city.questCompletedAt[q.id];
                    return (
                      <li
                        key={q.id}
                        className="flex flex-col gap-0.5 text-[10px] leading-tight text-slate-400"
                      >
                        <span
                          className={cn(
                            full &&
                              "text-slate-300 line-through decoration-slate-600"
                          )}
                        >
                          {q.title}
                        </span>
                        {full ? (
                          <span className="text-[9px] text-imperial-gold/80">
                            本日已办满（{max}/{max}）· 末次{" "}
                            {formatCompletedAt(at ?? 0)}
                          </span>
                        ) : count > 0 ? (
                          <span className="text-[9px] text-imperial-gold/70">
                            本日已办 {count}/{max}
                            {at ? ` · 末次 ${formatCompletedAt(at)}` : ""}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-600">未办</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {quests.length === 0 ? (
        <p className="mt-2 text-center text-[10px] text-slate-500">
          枢密院尚无政务条目，无法统计建设度。
        </p>
      ) : null}
    </div>
  );
}
