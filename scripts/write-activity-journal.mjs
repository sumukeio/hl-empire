import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const b64 = JSON.parse(
  readFileSync(join(root, "scripts/activity-strings.b64.json"), "utf8")
);
const S = Object.fromEntries(
  Object.entries(b64).map(([k, v]) => [k, Buffer.from(v, "base64").toString("utf8")])
);
const j = (v) => JSON.stringify(v);

const TYPE_LABEL = {
  decree: S.decree,
  treasury: S.treasury,
  battle: S.battle,
  info: S.info,
};

const content = `"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ScrollText } from "lucide-react";

import { MobileSubpageShell } from "@/components/layout/mobile-subpage-shell";
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
  groupLogsByLocalDayDescending,
  logsToJsonExport,
  logsToMarkdown,
  parseLocalYmToMonthRange,
  parseLocalYmdToDayRange,
  weekBoundsContainingLocalYmd,
  type ActivityDimension,
  type TimeRangeMs,
} from "@/lib/activity-report";
import {
  formatBeijingDateTime,
  getBeijingDateString,
} from "@/lib/beijing-time";
import { touchInput, touchTargetInline } from "@/lib/mobile-ui";
import {
  WORK_OPERATION_LABEL,
  WORK_SESSION_STATUS_LABEL,
} from "@/lib/work-session-labels";
import { cn } from "@/lib/utils";
import type {
  EventLog,
  EventLogType,
  QuestWorkSessionRecord,
} from "@/store/types";
import { useEventStore, useWorkSessionStore } from "@/store";

const RETENTION_NOTE = ${j(S.RETENTION)};

function sessionTimestampMs(s: QuestWorkSessionRecord): number {
  const raw = s.lastActionAt ?? s.firstActionAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function filterSessionsByRange(
  sessions: QuestWorkSessionRecord[],
  range: TimeRangeMs
): QuestWorkSessionRecord[] {
  return sessions.filter((s) => {
    const t = sessionTimestampMs(s);
    return t >= range.start && t < range.end;
  });
}

const TYPE_LABEL: Record<EventLogType, string> = ${JSON.stringify(TYPE_LABEL, null, 2)};

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

function RangePickers({
  dimension,
  setDimension,
  dayPick,
  setDayPick,
  weekPick,
  setWeekPick,
  monthPick,
  setMonthPick,
}: {
  dimension: ActivityDimension;
  setDimension: (d: ActivityDimension) => void;
  dayPick: string;
  setDayPick: (v: string) => void;
  weekPick: string;
  setWeekPick: (v: string) => void;
  monthPick: string;
  setMonthPick: (v: string) => void;
}) {
  return (
    <Tabs
      value={dimension}
      onValueChange={(v) => setDimension(v as ActivityDimension)}
    >
      <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-slate-900/80 p-1">
        <TabsTrigger value="day" className={touchTargetInline}>
          \u65e5
        </TabsTrigger>
        <TabsTrigger value="week" className={touchTargetInline}>
          \u5468
        </TabsTrigger>
        <TabsTrigger value="month" className={touchTargetInline}>
          \u6708
        </TabsTrigger>
      </TabsList>

      <TabsContent value="day" className="mt-3 space-y-2">
        <Label htmlFor="activity-day" className="text-xs text-muted-foreground">
          ${S.dayLabel}
        </Label>
        <input
          id="activity-day"
          type="date"
          value={dayPick}
          onChange={(e) => setDayPick(e.target.value)}
          className={cn(
            "w-full max-w-none rounded-md border border-imperial-gold/25 bg-slate-900/90 px-3 text-base text-foreground sm:max-w-xs sm:text-sm",
            touchInput
          )}
        />
      </TabsContent>

      <TabsContent value="week" className="mt-3 space-y-2">
        <Label htmlFor="activity-week" className="text-xs text-muted-foreground">
          ${S.weekLabel}
        </Label>
        <input
          id="activity-week"
          type="date"
          value={weekPick}
          onChange={(e) => setWeekPick(e.target.value)}
          className={cn(
            "w-full max-w-none rounded-md border border-imperial-gold/25 bg-slate-900/90 px-3 text-base text-foreground sm:max-w-xs sm:text-sm",
            touchInput
          )}
        />
      </TabsContent>

      <TabsContent value="month" className="mt-3 space-y-2">
        <Label htmlFor="activity-month" className="text-xs text-muted-foreground">
          ${S.monthLabel}
        </Label>
        <input
          id="activity-month"
          type="month"
          value={monthPick}
          onChange={(e) => setMonthPick(e.target.value)}
          className={cn(
            "w-full max-w-none rounded-md border border-imperial-gold/25 bg-slate-900/90 px-3 text-base text-foreground sm:max-w-xs sm:text-sm",
            touchInput
          )}
        />
      </TabsContent>
    </Tabs>
  );
}

function RangeSummaryBar({
  rangeHuman,
  countLabel,
}: {
  rangeHuman: string;
  countLabel: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
      <span className="text-xs text-muted-foreground">${S.currentRange}</span>
      <span className="rounded-md border border-imperial-gold/30 bg-imperial-gold/10 px-2 py-1 text-xs font-medium text-imperial-gold">
        {rangeHuman}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground">
        {countLabel}
      </span>
    </div>
  );
}

export function ActivityJournalView({ className }: { className?: string }) {
  const logs = useEventStore((s) => s.logs);
  const sessions = useWorkSessionStore((s) => s.sessions);
  const [mainTab, setMainTab] = useState<"docket" | "work">("docket");
  const [mounted, setMounted] = useState(false);
  const [dimension, setDimension] = useState<ActivityDimension>("day");
  const [dayPick, setDayPick] = useState("");
  const [weekPick, setWeekPick] = useState("");
  const [monthPick, setMonthPick] = useState("");

  useEffect(() => {
    const ymd = getBeijingDateString();
    const parts = ymd.split("-");
    setDayPick(ymd);
    setWeekPick(ymd);
    setMonthPick(\`\${parts[0]}-\${parts[1]}\`);
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

  const filteredSessions = useMemo((): QuestWorkSessionRecord[] => {
    if (!range) return [];
    return filterSessionsByRange(sessions, range).sort(
      (a, b) => sessionTimestampMs(b) - sessionTimestampMs(a)
    );
  }, [sessions, range]);

  const grouped = useMemo(
    () => groupLogsByLocalDayDescending(filtered),
    [filtered]
  );

  const counts = useMemo(() => countLogsByType(filtered), [filtered]);

  const rangeHuman = range ? buildRangeHumanLabel(range) : "\u2014";
  const rangeFileTag = range ? buildRangeLabelLocal(range) : "unknown";

  const exportMd = () => {
    if (!range) return;
    const body = logsToMarkdown({
      logs: filtered,
      rangeHuman,
      note: RETENTION_NOTE,
    });
    downloadTextFile(
      \`hanling-\u52e4\u653f\u5f55-\${rangeFileTag}.md\`,
      body,
      "text/markdown"
    );
  };

  const exportJson = () => {
    if (!range) return;
    const base = logsToJsonExport({
      logs: filtered,
      range,
      rangeHuman,
      note: RETENTION_NOTE,
    });
    const payload = JSON.parse(base) as Record<string, unknown>;
    payload.workSessions = filteredSessions;
    downloadTextFile(
      \`hanling-\u52e4\u653f\u5f55-\${rangeFileTag}.json\`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  const rangePickers = (
    <RangePickers
      dimension={dimension}
      setDimension={setDimension}
      dayPick={dayPick}
      setDayPick={setDayPick}
      weekPick={weekPick}
      setWeekPick={setWeekPick}
      monthPick={monthPick}
      setMonthPick={setMonthPick}
    />
  );

  return (
    <div className={cn("space-y-6 overflow-x-hidden", className)}>
      <Card className="border-imperial-gold/25 bg-slate-950/40">
        <CardHeader className="space-y-1 pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-imperial-gold">
            <ScrollText className="h-5 w-5 shrink-0" />
            ${S.title}
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {RETENTION_NOTE}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={mainTab}
            onValueChange={(v) => setMainTab(v as "docket" | "work")}
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-slate-900/80 p-1">
              <TabsTrigger value="docket" className={touchTargetInline}>
                ${S.docket}
              </TabsTrigger>
              <TabsTrigger value="work" className={touchTargetInline}>
                ${S.work}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="docket" className="mt-4 space-y-4">
              {rangePickers}
              <RangeSummaryBar
                rangeHuman={rangeHuman}
                countLabel={\`\u5171 \${filtered.length} \u6761\`}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "w-full border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10 sm:w-auto",
                    touchTargetInline
                  )}
                  disabled={!range || filtered.length === 0}
                  onClick={exportMd}
                >
                  <Download className="h-4 w-4" />
                  ${S.exportMd}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={cn(
                    "w-full border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10 sm:w-auto",
                    touchTargetInline
                  )}
                  disabled={!range || filtered.length === 0}
                  onClick={exportJson}
                >
                  <Download className="h-4 w-4" />
                  ${S.exportJson}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="work" className="mt-4 space-y-4">
              <p className="text-xs leading-relaxed text-muted-foreground">
                ${S.workHint}
              </p>
              {rangePickers}
              <RangeSummaryBar
                rangeHuman={rangeHuman}
                countLabel={\`\u5171 \${filteredSessions.length} \u6761\u529e\u7406\u5468\u671f\`}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className={cn(
                  "w-full border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10 sm:w-auto",
                  touchTargetInline
                )}
                disabled={!range || filteredSessions.length === 0}
                onClick={exportJson}
              >
                <Download className="h-4 w-4" />
                ${S.exportJsonWork}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {mainTab === "docket" ? (
        <>
          <Card className="border-border/80 bg-card/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-foreground">${S.summary}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-xs sm:grid-cols-2">
                {(Object.keys(TYPE_LABEL) as EventLogType[]).map((t) => (
                  <li
                    key={t}
                    className="flex items-center justify-between rounded-md border border-slate-800/80 bg-slate-950/40 px-3 py-2.5"
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
            <h2 className="text-sm font-semibold text-foreground">
              ${S.timeline}
            </h2>
            {grouped.length === 0 ? (
              <p className="rounded-lg border border-dashed border-imperial-gold/25 bg-slate-950/40 px-4 py-8 text-center text-sm text-muted-foreground">
                ${S.noDocket}
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
                        {dayLogs.length} \u6761
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
                            {formatBeijingDateTime(log.time)}
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
                        <p className="break-words text-foreground/95">
                          {log.message}
                        </p>
                      </article>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">${S.workDetail}</h2>
          {filteredSessions.length === 0 ? (
            <p className="rounded-lg border border-dashed border-imperial-gold/25 bg-slate-950/40 px-4 py-8 text-center text-sm text-muted-foreground">
              ${S.noWork}
            </p>
          ) : (
            filteredSessions.map((session) => (
              <Card
                key={session.clientSessionId}
                className="overflow-hidden border-slate-800/90 bg-slate-950/35"
              >
                <CardHeader className="border-b border-slate-800/80 bg-slate-900/50 py-3">
                  <CardTitle className="text-sm font-semibold text-imperial-gold/95">
                    {session.questTitle}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {WORK_SESSION_STATUS_LABEL[session.status]}
                    </span>
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {session.cityDisplay ?? "\u2014"}
                    {session.sessionKind === "batch" && session.batchCityCount
                      ? \` \u00b7 \${session.batchCityCount} \u57ce\`
                      : ""}
                    {session.effectiveDurationMinutes != null
                      ? \` \u00b7 \u6709\u6548 \${session.effectiveDurationMinutes} \u5206\`
                      : ""}
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-slate-800/80">
                    {session.operations.map((op, idx) => {
                      const opMs = new Date(op.at).getTime();
                      return (
                        <li
                          key={\`\${session.clientSessionId}-\${idx}\`}
                          className="flex flex-col gap-1 px-4 py-3 text-xs sm:flex-row sm:items-baseline sm:justify-between sm:gap-2 sm:py-2.5"
                        >
                          <span className="font-medium text-foreground">
                            {WORK_OPERATION_LABEL[op.kind] ?? op.kind}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {Number.isFinite(opMs)
                              ? formatBeijingDateTime(opMs)
                              : op.at}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function ActivityJournalPageChrome() {
  return (
    <MobileSubpageShell
      title=${j(S.pageTitle)}
      subtitle=${j(S.pageSub)}
      maxWidthClass="max-w-3xl"
    >
      <ActivityJournalView />
    </MobileSubpageShell>
  );
}
`;

const outPath = join(root, "components/dashboard/activity-journal-view.tsx");
writeFileSync(outPath, content, "utf8");
console.log("wrote", outPath, content.length);
