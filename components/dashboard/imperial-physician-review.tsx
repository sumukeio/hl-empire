"use client";

import { useMemo, useState } from "react";
import { Copy, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  buildImperialReviewMarkdown,
  collectTodayCompletedQuestLines,
  filterLogsFromToday,
} from "@/lib/build-imperial-review";
import { useEmperorStore, useEventStore, useMapStore, useQuestStore } from "@/store";

export function ImperialPhysicianReview() {
  const [open, setOpen] = useState(false);
  const [markdown, setMarkdown] = useState("");
  const [copyHint, setCopyHint] = useState("");

  const quests = useQuestStore((s) => s.quests);
  const cities = useMapStore((s) => s.cities);
  const logs = useEventStore((s) => s.logs);
  const addLog = useEventStore((s) => s.addLog);
  const exp = useEmperorStore((s) => s.exp);
  const stamina = useEmperorStore((s) => s.stamina);

  const harvest = useMemo(
    () => ({
      doneTaskTitles: collectTodayCompletedQuestLines(cities, quests),
      activeCities: cities.filter((c) => c.status > 0),
      todayLogs: filterLogsFromToday(logs),
    }),
    [quests, cities, logs]
  );

  const onGenerate = () => {
    const md = buildImperialReviewMarkdown({
      exp,
      stamina,
      doneTaskTitles: harvest.doneTaskTitles,
      activeCities: harvest.activeCities,
      todayLogs: harvest.todayLogs,
    });
    setMarkdown(md);
    addLog("太医院：今日起居注已封装完成，等待圣上复盘。", "decree");
  };

  const onCopy = async () => {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopyHint("奏折已封装，请呈送 AI 导师");
      window.setTimeout(() => setCopyHint(""), 4000);
    } catch {
      setCopyHint("复制失败，请手动全选复制");
      window.setTimeout(() => setCopyHint(""), 4000);
    }
  };

  return (
    <>
      <div className="shrink-0 border-t border-border/80 px-3 py-3">
        <Button
          type="button"
          variant="outline"
          className="w-full border-2 border-imperial-vermilion/70 bg-transparent text-sm text-imperial-vermilion hover:bg-imperial-vermilion/10 hover:text-imperial-vermilion"
          onClick={() => {
            setOpen(true);
            setMarkdown("");
            setCopyHint("");
          }}
        >
          太医院：请脉复盘
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setMarkdown("");
            setCopyHint("");
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] w-[min(100vw-1rem,36rem)] gap-0 border-imperial-gold/20 bg-slate-950 p-0 text-slate-100 sm:max-w-lg">
          <DialogHeader className="border-b border-slate-800 px-5 pb-3 pt-5 text-left">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <FileText className="h-5 w-5" />
              太医院复盘
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              汇总今日政务、疆域与邸报，封装为起居注 Markdown。
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[min(60vh,480px)] flex-col gap-3 px-5 py-4">
            <Button
              type="button"
              className="w-full bg-imperial-vermilion/90 text-white hover:bg-imperial-vermilion"
              onClick={onGenerate}
            >
              生成今日复盘奏折
            </Button>

            {markdown ? (
              <ScrollArea className="min-h-[200px] flex-1 rounded-md border border-slate-800 bg-slate-900/60">
                <pre className="whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-slate-200 sm:text-xs">
                  {markdown}
                </pre>
              </ScrollArea>
            ) : (
              <p className="rounded-md border border-dashed border-slate-700 py-8 text-center text-xs text-slate-500">
                点击上方按钮生成奏折正文
              </p>
            )}

            {copyHint ? (
              <p className="text-center text-sm font-medium text-primary">
                {copyHint}
              </p>
            ) : null}
          </div>

          <DialogFooter className="border-t border-slate-800 px-5 py-4 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-slate-400"
              onClick={() => setOpen(false)}
            >
              退下
            </Button>
            <Button
              type="button"
              disabled={!markdown}
              className={cn(
                "gap-2 bg-primary text-primary-foreground hover:bg-primary/90",
                !markdown && "opacity-50"
              )}
              onClick={onCopy}
            >
              <Copy className="h-4 w-4" />
              一键复制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
