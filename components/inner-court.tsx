"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Ban,
  BookOpen,
  Building2,
  Coins,
  Landmark,
  Pill,
  Scroll,
  Skull,
  Tent,
  UtensilsCrossed,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEmperorStore } from "@/store";

/** 极短「撕纸」感提示音（无资源文件时由 WebAudio 合成）。 */
function playPaperRippleSound() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.11);
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore */
  }
}

type LocalToast = { tone: "ok" | "err"; text: string } | null;

export function InnerCourtCard({ className }: { className?: string }) {
  const gold = useEmperorStore((s) => s.gold);
  const privateVault = useEmperorStore((s) => s.privateVault);
  const morale = useEmperorStore((s) => s.morale);
  const literature = useEmperorStore((s) => s.literature);
  const isNomadMode = useEmperorStore((s) => s.isNomadMode);
  const healthCombo = useEmperorStore((s) => s.healthCombo);

  const consumeAntiInflammatory = useEmperorStore(
    (s) => s.consumeAntiInflammatory
  );
  const consumeJunkFood = useEmperorStore((s) => s.consumeJunkFood);
  const trainMartialArts = useEmperorStore((s) => s.trainMartialArts);
  const recordExpense = useEmperorStore((s) => s.recordExpense);
  const transferToPrivateVault = useEmperorStore(
    (s) => s.transferToPrivateVault
  );
  const visitImperialArchives = useEmperorStore(
    (s) => s.visitImperialArchives
  );
  const indulgeCommercialTourism = useEmperorStore(
    (s) => s.indulgeCommercialTourism
  );
  const setNomadMode = useEmperorStore((s) => s.setNomadMode);
  const rejectInvalidSocial = useEmperorStore((s) => s.rejectInvalidSocial);
  const meetGrandSecretariat = useEmperorStore((s) => s.meetGrandSecretariat);
  const acceptEntropyCompanion = useEmperorStore(
    (s) => s.acceptEntropyCompanion
  );

  const [amountRaw, setAmountRaw] = useState("");
  const [toast, setToast] = useState<LocalToast>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((t: LocalToast) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 2400);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    []
  );

  const parsedAmount = Number.parseFloat(amountRaw.replace(/,/g, ""));

  const canVisitArchives = privateVault >= 500;
  const canIndulgeTour = privateVault >= 1000;

  const onExpense = (type: "infrastructure" | "decadence") => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast({ tone: "err", text: "请输入有效银两数目。" });
      return;
    }
    const cost = type === "decadence" ? parsedAmount * 2 : parsedAmount;
    if (gold < cost) {
      showToast({ tone: "err", text: "国库银两不足，无法划账。" });
      return;
    }
    const ok = recordExpense(parsedAmount, type);
    if (ok) {
      setAmountRaw("");
      showToast({ tone: "ok", text: "度支已入账，邸报已发。" });
    }
  };

  const onTransferVault = () => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showToast({ tone: "err", text: "请输入有效银两数目。" });
      return;
    }
    if (gold < parsedAmount) {
      showToast({ tone: "err", text: "国库不足以转存此数。" });
      return;
    }
    const ok = transferToPrivateVault(parsedAmount);
    if (ok) {
      setAmountRaw("");
      showToast({ tone: "ok", text: "内帑已充实。" });
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card
        className={cn(
          "flex flex-col border-imperial-gold/25 bg-slate-950/80 shadow-inner",
          className
        )}
      >
        <CardHeader className="shrink-0 space-y-0 border-b border-imperial-gold/15 px-3 py-2.5 pb-2 pt-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-tight text-imperial-gold">
            <Landmark className="h-4 w-4 shrink-0" />
            养正司
          </CardTitle>
          <p className="text-[10px] leading-snug text-slate-500">
            饮食 · 度支 · 巡幸 · 宗务 — 连击 {healthCombo} · 民心 {morale}{" "}
            · 文学 {literature}（下方为内务府宫务）
          </p>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2.5 py-3">
          {toast ? (
            <div
              role="status"
              className={cn(
                "rounded-md border px-2 py-1.5 text-center text-[11px] font-medium",
                toast.tone === "ok"
                  ? "border-imperial-gold/40 bg-imperial-gold/10 text-imperial-gold"
                  : "border-imperial-vermilion/50 bg-imperial-vermilion/10 text-imperial-vermilion"
              )}
            >
              {toast.text}
            </div>
          ) : null}

          {/* 1. 太医院 */}
          <section className="rounded-md border border-slate-800/90 bg-slate-900/50 p-2">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              <Pill className="h-3.5 w-3.5 text-primary" />
              太医院
            </h3>
            <div className="grid gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-auto justify-start gap-2 border-imperial-gold/35 bg-slate-950/60 py-2 text-left text-[11px] text-slate-100 hover:bg-imperial-gold/10"
                onClick={() => consumeAntiInflammatory()}
              >
                <span aria-hidden className="text-base">
                  🥢
                </span>
                <span>
                  <span className="block font-medium">御膳房 · 抗炎仙丹</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    一锅出 / 全因食物 · +10 体力 · +1 健康 · 连击延寿
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-auto justify-start gap-2 border-primary/30 bg-slate-950/60 py-2 text-left text-[11px] text-slate-100 hover:bg-primary/10"
                onClick={() => trainMartialArts()}
              >
                <span aria-hidden className="text-base">
                  ⚔️
                </span>
                <span>
                  <span className="block font-medium">西殿 · 习武强身</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    深蹲 / 冷水洗脸 · −5 体力 · +2 武力
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-auto justify-start gap-2 border-imperial-vermilion/50 bg-imperial-vermilion/5 py-2 text-left text-[11px] text-imperial-vermilion hover:bg-imperial-vermilion/15"
                onClick={() => consumeJunkFood()}
              >
                <span aria-hidden className="text-base">
                  ☠️
                </span>
                <span>
                  <span className="block font-medium">暴食 · 误食毒丹</span>
                  <span className="text-[10px] font-normal text-imperial-vermilion/80">
                    高糖油炸外卖 · −30 体力 · −5 健康 · 打断连击
                  </span>
                </span>
              </Button>
            </div>
          </section>

          {/* 2. 户部度支 */}
          <section className="rounded-md border border-slate-800/90 bg-slate-900/50 p-2">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              <Coins className="h-3.5 w-3.5 text-imperial-gold" />
              户部度支
            </h3>
            <Label htmlFor="inner-court-amount" className="sr-only">
              银两
            </Label>
            <Input
              id="inner-court-amount"
              inputMode="decimal"
              placeholder="输入银两…"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              className="mb-2 h-9 border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-600"
            />
            <div className="grid gap-1.5">
              <Button
                type="button"
                size="sm"
                className="h-auto justify-start gap-2 bg-primary py-2 text-left text-[11px] text-primary-foreground hover:bg-primary/90"
                onClick={() => onExpense("infrastructure")}
              >
                <span aria-hidden className="text-base">
                  🏗️
                </span>
                <span>
                  <span className="block font-medium">工部拨款 · 实用基建</span>
                  <span className="text-[10px] font-normal opacity-90">
                    耐用品 / 房租 / 生产力 · 国库 −amount
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-auto justify-start gap-2 border-imperial-vermilion/60 bg-imperial-vermilion/5 py-2 text-left text-[11px] text-imperial-vermilion hover:bg-imperial-vermilion/10"
                onClick={() => onExpense("decadence")}
              >
                <span aria-hidden className="text-base">
                  🎭
                </span>
                <span>
                  <span className="block font-medium">骄奢淫逸 · 修建行宫</span>
                  <span className="text-[10px] font-normal text-imperial-vermilion/85">
                    双倍抄没 · 民心 −10
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-auto justify-start gap-2 border border-imperial-gold/40 bg-imperial-gold/15 py-2 text-left text-[11px] text-imperial-gold hover:bg-imperial-gold/25"
                onClick={onTransferVault}
              >
                <span aria-hidden className="text-base">
                  💰
                </span>
                <span>
                  <span className="block font-medium">充实内帑 · 转私库</span>
                  <span className="text-[10px] font-normal text-imperial-gold/80">
                    副业利润 · 国库 −amount · 私库 +amount
                  </span>
                </span>
              </Button>
            </div>
          </section>

          {/* 3. 理藩院 */}
          <section className="rounded-md border border-slate-800/90 bg-slate-900/50 p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                <Scroll className="h-3.5 w-3.5 text-slate-400" />
                理藩院
              </h3>
              <span className="tabular-nums text-[10px] font-medium text-imperial-gold">
                内帑 {privateVault.toLocaleString("zh-CN")} 两
              </span>
            </div>
            <div className="grid gap-1.5">
              {canVisitArchives ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-auto justify-start gap-2 bg-imperial-gold/90 py-2 text-left text-[11px] text-slate-950 hover:bg-imperial-gold"
                  onClick={() => {
                    if (!visitImperialArchives()) {
                      showToast({ tone: "err", text: "内帑不足 500 两。" });
                    }
                  }}
                >
                  <span aria-hidden className="text-base">
                    🏛️
                  </span>
                  <span>
                    <span className="block font-medium">国子监 / 太庙</span>
                    <span className="text-[10px] font-normal opacity-90">
                      人文古迹 · −500 内帑 · +50 功勋 · +5 文学
                    </span>
                  </span>
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex w-full">
                      <Button
                        type="button"
                        size="sm"
                        disabled
                        className="h-auto w-full cursor-not-allowed justify-start gap-2 py-2 text-left text-[11px] opacity-50"
                      >
                        <span aria-hidden className="text-base">
                          🏛️
                        </span>
                        <span>国子监 / 太庙</span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[14rem] border-imperial-gold/30 bg-slate-950 text-xs">
                    内帑须不少于 500 两方可出巡。
                  </TooltipContent>
                </Tooltip>
              )}

              {canIndulgeTour ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-auto justify-start gap-2 border-amber-600/50 py-2 text-left text-[11px] text-amber-200 hover:bg-amber-950/40"
                  onClick={() => {
                    if (!indulgeCommercialTourism()) {
                      showToast({ tone: "err", text: "内帑不足 1000 两。" });
                    }
                  }}
                >
                  <span aria-hidden className="text-base">
                    🎪
                  </span>
                  <span>
                    <span className="block font-medium">沉迷声色 · 网红打卡</span>
                    <span className="text-[10px] font-normal text-amber-200/70">
                      商业化景区 · −1000 内帑 · 无增益
                    </span>
                  </span>
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex w-full">
                      <Button
                        type="button"
                        size="sm"
                        disabled
                        className="h-auto w-full cursor-not-allowed justify-start gap-2 py-2 text-left text-[11px] opacity-50"
                      >
                        <span aria-hidden className="text-base">
                          🎪
                        </span>
                        <span>沉迷声色</span>
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[14rem] bg-slate-950 text-xs">
                    内帑须不少于 1000 两。
                  </TooltipContent>
                </Tooltip>
              )}

              <div className="flex items-center justify-between gap-2 rounded-md border border-slate-700/80 bg-slate-950/60 px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Tent className="h-4 w-4 shrink-0 text-imperial-gold" />
                  <Label
                    htmlFor="nomad-mode"
                    className="cursor-pointer text-[11px] leading-tight text-slate-200"
                  >
                    ⛺ 安营扎寨
                    <span className="mt-0.5 block text-[9px] font-normal text-slate-500">
                      移动行宫 · 军机 MVA 功勋 +20%
                    </span>
                  </Label>
                </div>
                <Switch
                  id="nomad-mode"
                  checked={isNomadMode}
                  onCheckedChange={(v) => setNomadMode(v === true)}
                  className="shrink-0 data-[state=checked]:bg-imperial-gold"
                />
              </div>
            </div>
          </section>

          {/* 4. 宗人府 */}
          <section className="rounded-md border border-slate-800/90 bg-slate-900/50 p-2">
            <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              宗人府
            </h3>
            <div className="grid gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-auto justify-start gap-2 border-primary/40 py-2 text-left text-[11px] text-primary hover:bg-primary/10"
                onClick={() => {
                  if (!meetGrandSecretariat()) {
                    showToast({ tone: "err", text: "体力不足 5 点，无法召见。" });
                  }
                }}
              >
                <span aria-hidden className="text-base">
                  📜
                </span>
                <span>
                  <span className="block font-medium">召见内阁</span>
                  <span className="text-[10px] font-normal text-slate-500">
                    导师 / AI · −5 体力 · +20 功勋
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-auto justify-start gap-2 bg-slate-800 py-2 text-left text-[11px] text-slate-100 hover:bg-slate-700"
                onClick={() => {
                  playPaperRippleSound();
                  rejectInvalidSocial();
                }}
              >
                <span aria-hidden className="text-base">
                  🛑
                </span>
                <span>
                  <span className="block font-medium">闭关锁国</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    拒无效聚餐 / 搭讪 · +15 体力
                  </span>
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-auto justify-start gap-2 border-imperial-vermilion/60 bg-imperial-vermilion/5 py-2 text-left text-[11px] text-imperial-vermilion hover:bg-imperial-vermilion/15"
                onClick={() => {
                  if (!acceptEntropyCompanion()) {
                    showToast({ tone: "err", text: "私库已空，妖姬无处下手。" });
                  }
                }}
              >
                <Skull className="h-4 w-4 shrink-0" />
                <span>
                  <span className="block font-medium">祸国妖姬</span>
                  <span className="text-[10px] font-normal text-imperial-vermilion/80">
                    私库 −50% · 民心 −20
                  </span>
                </span>
              </Button>
            </div>
          </section>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
