"use client";

import { useEffect, useMemo, useState } from "react";
import { Flame, RotateCcw, ScrollText, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EventLog, EventLogType } from "@/store/types";
import { useEventStore } from "@/store";

const MAX_SHOW = 80;

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

function revertHint(
  reason:
    | "not_found"
    | "no_revert"
    | "state_mismatch"
    | "city_missing"
    | "not_supported"
): string {
  switch (reason) {
    case "not_found":
      return "未找到该条邸报。";
    case "no_revert":
      return "此类邸报无可撤回的状态。";
    case "state_mismatch":
      return "勘合状态已变（可能已手动取消），无法按原样回滚。";
    case "city_missing":
      return "对应城池已不存在，无法回滚。";
    case "not_supported":
      return "该邸报暂不支持撤回。";
    default:
      return "撤回失败。";
  }
}

export type EventLogPanelProps = {
  className?: string;
};

/** 邸报列表（顶栏 Dialog 或内嵌复用） */
export function EventLogPanel({ className }: EventLogPanelProps) {
  const logs = useEventStore((s) => s.logs);
  const clearLogs = useEventStore((s) => s.clearLogs);
  const revertLog = useEventStore((s) => s.revertLog);
  const [pulse, setPulse] = useState(false);
  const [revertBanner, setRevertBanner] = useState<string | null>(null);

  const visible = useMemo(() => logs.slice(0, MAX_SHOW), [logs]);

  const revertableCount = useMemo(
    () => visible.filter((l) => Boolean(l.revert)).length,
    [visible]
  );

  useEffect(() => {
    if (!logs.length) return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 600);
    return () => window.clearTimeout(t);
  }, [logs]);

  const onRevert = (logId: string) => {
    setRevertBanner(null);
    const r = revertLog(logId);
    if (!r.ok) {
      const msg = revertHint(r.reason);
      console.warn("[Hanling] revertLog 失败:", r.reason, msg);
      setRevertBanner(msg);
      window.setTimeout(() => setRevertBanner(null), 10_000);
    } else {
      setRevertBanner("已撤回：本条邸报已移除，体力/功勋/勘合已回滚。");
      window.setTimeout(() => setRevertBanner(null), 3500);
    }
  };

  return (
    <Card
      className={cn(
        "border-imperial-vermilion/40 bg-background/95 shadow-xl backdrop-blur-sm transition-shadow",
        pulse && "ring-1 ring-primary/50",
        className
      )}
    >
      <CardHeader className="flex flex-col gap-1 space-y-0 pb-2 pt-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-imperial-vermilion">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-imperial-vermilion opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-imperial-vermilion" />
            </span>
            八百里加急
          </CardTitle>
          <p className="text-[10px] leading-snug text-muted-foreground">
            仅<strong className="text-imperial-gold/90">军机点卯</strong>
            且仍可对上勘合状态的条目显示金色「撤回」；校准国库、岁入等无游戏回滚数据。
            <span className="mt-0.5 block text-muted-foreground/85">
              本列表可撤回：<span className="tabular-nums text-foreground">{revertableCount}</span>{" "}
              条。是否可撤回<strong className="text-slate-300">不看时间</strong>
              （没有「几分钟后就不能撤」）；跨日后当日勘合已清空时，带「撤回」的军机邸报仍显示按钮，但点击会提示无法回滚。
            </span>
          </p>
        </div>
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
        {revertBanner ? (
          <p
            className={cn(
              "rounded border px-2 py-1.5 text-[11px]",
              revertBanner.startsWith("已撤回")
                ? "border-emerald-600/50 bg-emerald-950/40 text-emerald-200"
                : "border-imperial-vermilion/40 bg-imperial-vermilion/10 text-imperial-vermilion"
            )}
          >
            {revertBanner}
          </p>
        ) : null}
        {visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            暂无邸报。勘合城池或点卯军机后在此播报。
          </p>
        ) : (
          <ul className="max-h-[min(52vh,20rem)] space-y-2 overflow-y-auto sm:max-h-[16rem]">
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
                      log.emphasis === "crimsonDecree" &&
                        "rounded-md border border-red-600/70 bg-gradient-to-r from-red-950/95 via-red-900/80 to-red-950/95 px-2 py-1 font-bold tracking-wide text-red-100 shadow-[0_0_14px_rgba(220,38,38,0.35)] animate-pulse",
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
                <div className="shrink-0 self-start pt-0.5">
                  {log.revert ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 min-w-[4.5rem] gap-1 border-imperial-gold/50 bg-imperial-gold/10 px-2 text-[10px] font-medium text-imperial-gold hover:bg-imperial-gold/20 hover:text-imperial-gold"
                      title="撤回本条：回滚体力、功勋与翻牌券，并取消本城该条勘合"
                      onClick={() => onRevert(log.id)}
                    >
                      <RotateCcw className="h-3 w-3" />
                      撤回
                    </Button>
                  ) : (
                    <span
                      className="inline-flex h-8 min-w-[4.5rem] items-center justify-end gap-1 whitespace-nowrap rounded-md border border-transparent px-1 text-[10px] text-muted-foreground/70"
                      title="仅军机点卯且未跨日/未手动取消勘合的邸报可撤回"
                    >
                      <span aria-hidden className="text-muted-foreground/40">
                        —
                      </span>
                      无可撤回
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
