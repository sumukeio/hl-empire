"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { cityStatusProgressTone } from "@/lib/city-status";
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

export type CityImperialProgressProps = {
  city: City;
  quests: Quest[];
  /** 与奏折内「疆域态势」草稿一致，便于预览色调。 */
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
        <span className="text-[10px] text-slate-500">四部 · 点按下钻</span>
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
