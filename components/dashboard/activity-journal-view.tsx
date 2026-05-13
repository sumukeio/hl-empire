"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildRangeHumanLabel,
  buildRangeLabelLocal,
  countLogsByType,
  downloadTextFile,
  filterLogsByRange,
  formatYmdLocal,
  groupLogsByLocalDayDescending,
  logsToJsonExport,
  logsToMarkdown,
  parseLocalYmToMonthRange,
  parseLocalYmdToDayRange,
  weekBoundsContainingLocalYmd,
  type ActivityDimension,
} from "@/lib/activity-report";
import { cn } from "@/lib/utils";
import type { EventLog, EventLogType } from "@/store/types";
import { useEventStore } from "@/store";

const RETENTION_NOTE =
  "邸报在本地约保留最近 80 条，跨度较大时记录可能不全；重要节点请定期导出备份，或使用造办处「帝国密函」全量导出。";

const TYPE_LABEL: Record<EventLogType, string> = {
  decree: "朱批 / 诏令",
  treasury: "户部 / 内帑",
  battle: "边情 / 战报",
  info: "起居注",
};

function typeBadgeClass(t: EventLogType): string {
  switch (t) {
    case "decree":
      return "border-imperial-gold/40 bg-imperial-gold/15 text-imperial-gold";
    case "treasury":
      return "border-emerald-700/40 bg-emerald-950/50 text-emerald-200/90";
    case "battle":
      return "border-imperial-vermilion/45 bg-imperial-vermilion/10 text-imperial-vermilion";
    default:
      return "border-slate-600/50 bg-slate-900/60 text-slate-300";
  }
}

export function ActivityJournalView({ className }: { className?: string }) {
  const logs = useEventStore((s) => s.logs);
  const [mounted, setMounted] = useState(false);
  const [dimension, setDimension] = useState<ActivityDimension>("day");
  const [dayPick, setDayPick] = useState("");
  const [weekPick, setWeekPick] = useState("");
  const [monthPick, setMonthPick] = useState("");

  useEffect(() => {
    const now = new Date();
    const ymd = formatYmdLocal(now);
    setDayPick(ymd);
    setWeekPick(ymd);
    setMonthPick(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );
    setMounted(true);
  }, []);

  const range = useMemo(() => {
    if (!mounted) return null;
    if (dimension === "day") {
      return parseLocalYmdToDayRange(dayPick);
    }
    if (dimension === "week") {
      return weekBoundsContainingLocalYmd(weekPick);
    }
    return parseLocalYmToMonthRange(monthPick);
  }, [mounted, dimension, dayPick, weekPick, monthPick]);

  const filtered = useMemo((): EventLog[] => {
    if (!range) return [];
    return filterLogsByRange(logs, range);
  }, [logs, range]);

  const grouped = useMemo(
    () => groupLogsByLocalDayDescending(filtered),
    [filtered]
  );

  const counts = useMemo(() => countLogsByType(filtered), [filtered]);

  const rangeHuman = range ? buildRangeHumanLabel(range) : "—";
  const rangeFileTag = range ? buildRangeLabelLocal(range) : "unknown";

  const exportMd = () => {
    if (!range) return;
    const body = logsToMarkdown({
      logs: filtered,
      rangeHuman,
      note: RETENTION_NOTE,
    });
    downloadTextFile(
      `hanling-勤政录-${rangeFileTag}.md`,
      body,
      "text/markdown"
    );
  };

  const exportJson = () => {
    if (!range) return;
    const body = logsToJsonExport({
      logs: filtered,
      range,
      rangeHuman,
      note: RETENTION_NOTE,
    });
    downloadTextFile(
      `hanling-勤政录-${rangeFileTag}.json`,
      body,
      "application/json"
    );
  };

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="border-imperial-gold/25 bg-slate-950/40">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-imperial-gold">
            <ScrollText className="h-5 w-5 shrink-0" />
            勤政录（起居注）
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            按日 / 周 / 月查看邸报时间线，并导出 Markdown 或 JSON。{RETENTION_NOTE}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={dimension}
            onValueChange={(v) => setDimension(v as ActivityDimension)}
          >
            <TabsList className="grid w-full max-w-md grid-cols-3 bg-slate-900/80">
              <TabsTrigger value="day">日</TabsTrigger>
              <TabsTrigger value="week">周</TabsTrigger>
              <TabsTrigger value="month">月</TabsTrigger>
            </TabsList>

            <TabsContent value="day" className="mt-3 space-y-2">
              <Label htmlFor="activity-day" className="text-xs text-muted-foreground">
                选择自然日（本机时区）
              </Label>
              <input
                id="activity-day"
                type="date"
                value={dayPick}
                onChange={(e) => setDayPick(e.target.value)}
                className="h-10 w-full max-w-xs rounded-md border border-imperial-gold/25 bg-slate-900/90 px-3 text-sm text-foreground"
              />
            </TabsContent>

            <TabsContent value="week" className="mt-3 space-y-2">
              <Label htmlFor="activity-week" className="text-xs text-muted-foreground">
                选择一周内任意一天 · 展示该日所在「周一至周日」整周
              </Label>
              <input
                id="activity-week"
                type="date"
                value={weekPick}
                onChange={(e) => setWeekPick(e.target.value)}
                className="h-10 w-full max-w-xs rounded-md border border-imperial-gold/25 bg-slate-900/90 px-3 text-sm text-foreground"
              />
            </TabsContent>

            <TabsContent value="month" className="mt-3 space-y-2">
              <Label htmlFor="activity-month" className="text-xs text-muted-foreground">
                选择自然月
              </Label>
              <input
                id="activity-month"
                type="month"
                value={monthPick}
                onChange={(e) => setMonthPick(e.target.value)}
                className="h-10 w-full max-w-xs rounded-md border border-imperial-gold/25 bg-slate-900/90 px-3 text-sm text-foreground"
              />
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
            <span className="text-xs text-muted-foreground">当前范围</span>
            <span className="rounded-md border border-imperial-gold/30 bg-imperial-gold/10 px-2 py-1 text-xs font-medium text-imperial-gold">
              {rangeHuman}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              共 {filtered.length} 条
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10"
              disabled={!range || filtered.length === 0}
              onClick={exportMd}
            >
              <Download className="h-4 w-4" />
              导出 Markdown
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10"
              disabled={!range || filtered.length === 0}
              onClick={exportJson}
            >
              <Download className="h-4 w-4" />
              导出 JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-card/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-foreground">摘要</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-xs sm:grid-cols-2">
            {(Object.keys(TYPE_LABEL) as EventLogType[]).map((t) => (
              <li
                key={t}
                className="flex items-center justify-between rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2"
              >
                <span className="text-muted-foreground">{TYPE_LABEL[t]}</span>
                <span className="tabular-nums font-medium text-foreground">
                  {counts[t]}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">时间线（按日折叠）</h2>
        {grouped.length === 0 ? (
          <p className="rounded-lg border border-dashed border-imperial-gold/25 bg-slate-950/40 px-4 py-8 text-center text-sm text-muted-foreground">
            该范围内暂无邸报。
          </p>
        ) : (
          grouped.map(({ day, logs: dayLogs }) => (
            <Card
              key={day}
              className="overflow-hidden border-slate-800/90 bg-slate-950/35"
            >
              <CardHeader className="border-b border-slate-800/80 bg-slate-900/50 py-3">
                <CardTitle className="text-sm font-semibold tracking-tight text-imperial-gold/95">
                  {day}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {dayLogs.length} 条
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y divide-slate-800/80 p-0">
                {dayLogs.map((log) => (
                  <article
                    key={log.id}
                    className="px-4 py-3 text-sm leading-relaxed"
                  >
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <time
                        className="tabular-nums text-xs text-muted-foreground"
                        dateTime={new Date(log.time).toISOString()}
                      >
                        {new Date(log.time).toLocaleTimeString("zh-CN", {
                          hour12: false,
                        })}
                      </time>
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                          typeBadgeClass(log.type)
                        )}
                      >
                        {log.type}
                      </span>
                      {log.cityName ? (
                        <span className="text-[11px] text-slate-400">
                          {log.cityName}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-foreground/95">{log.message}</p>
                  </article>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export function ActivityJournalPageChrome() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-imperial-gold hover:bg-imperial-gold/10"
            asChild
          >
            <Link href="/dashboard" aria-label="返回九州图志">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-imperial-gold">
              勤政录
            </h1>
            <p className="text-[11px] text-muted-foreground">日 / 周 / 月 · 导出</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        <ActivityJournalView />
      </main>
    </div>
  );
}
