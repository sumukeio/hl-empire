"use client";

import { useMemo } from "react";
import { Crown, ScrollText, Stamp, Star } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EMPEROR_TITLE_LADDER,
  getEmperorTitleTierIndex,
  getEmperorTitleProgress,
  getRankToneFromTitle,
  type EmperorTitleTier,
} from "@/lib/emperor-title";
import { cn } from "@/lib/utils";

function formatExpRange(tier: EmperorTitleTier): string {
  if (tier.maxExclusive == null) {
    return `${tier.minExp.toLocaleString("zh-CN")} 及以上`;
  }
  const hi = tier.maxExclusive - 1;
  return `${tier.minExp.toLocaleString("zh-CN")} — ${hi.toLocaleString("zh-CN")}`;
}

function rankToneClasses(title: string): string {
  const tone = getRankToneFromTitle(title);
  if (tone === "zheng") {
    return "border-amber-900/35 bg-amber-950/[0.22]";
  }
  if (tone === "cong") {
    return "border-slate-800/70 bg-slate-950/[0.72]";
  }
  return "border-slate-800/40 bg-slate-900/35";
}

export type AscensionLadderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exp: number;
};

/** 九品中正尊号长阶：自下而上为布衣至超凡（卷轴式时间轴，apex 在上） */
export function AscensionLadderDialog({
  open,
  onOpenChange,
  exp,
}: AscensionLadderDialogProps) {
  const currentIdx = useMemo(() => getEmperorTitleTierIndex(exp), [exp]);
  const progress = useMemo(() => getEmperorTitleProgress(exp), [exp]);

  const tiersBottomToTop = useMemo(
    () => [...EMPEROR_TITLE_LADDER].reverse(),
    []
  );

  let footerText: string;
  if (progress.isApex) {
    footerText = "圣上已达当今尊号之巅，万世基业无可再晋。";
  } else if (
    progress.nextTier != null &&
    progress.expToNextThreshold != null
  ) {
    footerText = `距下一阶「${progress.nextTier.level}」还需 ${progress.expToNextThreshold.toLocaleString("zh-CN")} 功勋`;
  } else {
    footerText = "圣上已达当今尊号之巅，万世基业无可再晋。";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90dvh,40rem)] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden border-imperial-gold/25 bg-slate-950 p-0 text-slate-100",
          "sm:max-w-lg sm:rounded-lg"
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-imperial-gold/15 px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
          <DialogTitle className="flex items-center justify-center gap-2 text-center text-lg font-semibold tracking-tight text-imperial-gold sm:justify-start sm:text-left">
            <ScrollText className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
            万世基业图谱
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500 sm:text-left">
            登天长阶 · 九品中正二十五阶（自下而上）；当前累计{" "}
            <span className="tabular-nums text-imperial-gold/90">
              {Math.max(0, Math.floor(Number.isFinite(exp) ? exp : 0)).toLocaleString("zh-CN")}
            </span>{" "}
            功勋
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          <div
            className="relative ml-1 border-l-2 border-imperial-gold/25 pl-3 sm:ml-2 sm:pl-4"
            role="list"
            aria-label="尊号阶梯"
          >
            {tiersBottomToTop.map((tier) => {
              const idx = EMPEROR_TITLE_LADDER.indexOf(tier);
              const isCurrent = idx === currentIdx;
              const isAchieved = idx < currentIdx;
              const isLocked = idx > currentIdx;

              return (
                <div
                  key={tier.minExp}
                  role="listitem"
                  className="relative pb-2 last:pb-0"
                >
                  <span
                    className={cn(
                      "absolute -left-[calc(0.5rem+5px)] top-2 h-2 w-2 rounded-full border sm:-left-[calc(0.75rem+5px)]",
                      isCurrent &&
                        "border-imperial-gold bg-imperial-gold shadow-[0_0_10px_rgba(245,158,11,0.7)]",
                      isAchieved &&
                        !isCurrent &&
                        "border-imperial-gold/50 bg-imperial-gold/40",
                      isLocked && "border-slate-700 bg-slate-900"
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "relative flex gap-2 rounded-md border px-2 py-1.5 sm:gap-2.5 sm:px-2.5 sm:py-2",
                      rankToneClasses(tier.title),
                      isCurrent &&
                        "border-imperial-gold/70 shadow-[0_0_18px_rgba(245,158,11,0.28)] ring-1 ring-imperial-gold/35",
                      isLocked && "opacity-45"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded border text-[10px] sm:h-8 sm:w-8",
                        isCurrent &&
                          "border-imperial-gold/55 bg-imperial-gold/15 text-imperial-gold",
                        isAchieved &&
                          !isCurrent &&
                          "border-imperial-gold/30 bg-imperial-gold/10 text-imperial-gold/90",
                        isLocked &&
                          "border-slate-700/60 bg-slate-900/40 text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      {isAchieved && !isCurrent ? (
                        <Stamp className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : isCurrent ? (
                        <Crown className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : (
                        <Star className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 leading-tight">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <span
                          className={cn(
                            "text-xs font-semibold sm:text-sm",
                            isLocked ? "text-muted-foreground" : "text-slate-100"
                          )}
                        >
                          {tier.level}
                        </span>
                        {isCurrent ? (
                          <span className="rounded border border-imperial-gold/45 bg-imperial-gold/12 px-1 py-px text-[9px] font-medium text-imperial-gold">
                            当前
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={cn(
                          "mt-0.5 text-[11px] font-medium sm:text-xs",
                          isLocked
                            ? "text-muted-foreground"
                            : "text-imperial-gold/88"
                        )}
                      >
                        {tier.title}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 text-[10px] tabular-nums sm:text-[11px]",
                          isLocked ? "text-muted-foreground" : "text-slate-500"
                        )}
                      >
                        {formatExpRange(tier)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-imperial-gold/20 bg-slate-950 px-3 py-3 sm:px-6 sm:py-4">
          <p className="text-center text-sm font-semibold leading-snug text-imperial-gold sm:text-base">
            {footerText}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
