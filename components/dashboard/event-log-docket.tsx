"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, ScrollText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EventLog, EventLogType } from "@/store/types";
import { useEventStore } from "@/store";

const VISIBLE = 5;

function typeIcon(type: EventLogType) {
  switch (type) {
    case "battle":
      return <Flame className="h-3.5 w-3.5 text-imperial-vermilion" />;
    case "treasury":
      return <ScrollText className="h-3.5 w-3.5 text-imperial-gold" />;
    case "decree":
      return <ScrollText className="h-3.5 w-3.5 text-primary" />;
    default:
      return <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export type EventLogPanelProps = {
  className?: string;
};

/** 邸报列表（顶栏 Dialog 或内嵌复用） */
export function EventLogPanel({ className }: EventLogPanelProps) {
  const logs = useEventStore((s) => s.logs);
  const clearLogs = useEventStore((s) => s.clearLogs);
  const [pulse, setPulse] = useState(false);

  const visible = useMemo(() => logs.slice(0, VISIBLE), [logs]);

  useEffect(() => {
    if (!logs.length) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 600);
    return () => window.clearTimeout(t);
  }, [logs]);

  return (
    <Card
      className={cn(
        "border-imperial-vermilion/40 bg-background/95 shadow-xl backdrop-blur-sm transition-shadow",
        pulse && "ring-1 ring-primary/50",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-imperial-vermilion">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-imperial-vermilion opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-imperial-vermilion" />
          </span>
          八百里加急
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => clearLogs()}
          title="清空邸报"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-3 pt-0">
        {visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            暂无邸报。勘合城池或点卯军机后在此播报。
          </p>
        ) : (
          <ul className="max-h-[min(40vh,14rem)] space-y-2 overflow-y-auto sm:max-h-[11rem]">
            {visible.map((log: EventLog) => (
              <li
                key={log.id}
                className="flex gap-2 border-b border-border/50 pb-2 text-xs last:border-0 last:pb-0"
              >
                <span className="mt-0.5 shrink-0">{typeIcon(log.type)}</span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "break-words leading-snug",
                      log.emphasis === "calamity" &&
                        "animate-pulse font-semibold text-imperial-vermilion",
                      log.emphasis === "goldFlash" &&
                        "animate-pulse font-medium text-imperial-gold",
                      !log.emphasis && "text-foreground"
                    )}
                  >
                    {log.message}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span>{formatTime(log.time)}</span>
                    {log.cityName ? (
                      <span className="rounded border border-imperial-gold/30 bg-imperial-gold/10 px-1.5 py-px text-[9px] text-imperial-gold">
                        {log.cityName}
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
