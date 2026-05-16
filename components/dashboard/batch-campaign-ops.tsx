"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Layers, Pause, Play, Swords } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import {
  CAMPAIGN_PHASES,
  campaignPhaseLabel,
  filterQuestsByCampaignPhase,
  getQuestCampaignPhase,
} from "@/lib/campaign-phase";
import {
  computeBatchCampaignTimerThresholds,
  resolveBatchCampaignEligibility,
} from "@/lib/batch-campaign";
import { getQuestAffiliation } from "@/lib/quest-affiliation";
import { getTerritoryCities } from "@/lib/tongwu-si";
import { cn } from "@/lib/utils";
import {
  getQuestTimerEffectiveElapsedMs,
  getQuestTimerPauseBudgetUsedMs,
  QUEST_TIMER_CANCEL_WINDOW_MS,
  QUEST_TIMER_MAX_PAUSE_MS,
  useEmperorStore,
  useEventStore,
  useMapStore,
  useQuestStore,
} from "@/store";
import type { CampaignPhase, Quest } from "@/store/types";

function formatMmSs(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatQuestDurationMinutes(m: number): string {
  if (!Number.isFinite(m) || m <= 0) return "—";
  if (m >= 60 && m % 60 === 0) return `${m / 60}h`;
  return `${Math.round(m)}m`;
}

export type BatchCampaignOpsProps = {
  className?: string;
  /** 深链 `?phase=` */
  defaultPhase?: CampaignPhase;
  /** 深链 `?cities=id1,id2` */
  defaultCityIds?: string[];
};

export function BatchCampaignOps({
  className,
  defaultPhase,
  defaultCityIds,
}: BatchCampaignOpsProps) {
  const cities = useMapStore((s) => s.cities);
  const territoryCities = useMemo(() => getTerritoryCities(cities), [cities]);
  const quests = useQuestStore((s) => s.quests);
  const stamina = useEmperorStore((s) => s.stamina);
  const activeBatch = useQuestStore((s) => s.activeBatchCampaign);
  const startBatch = useQuestStore((s) => s.startBatchCampaignQuest);
  const completeBatch = useQuestStore((s) => s.completeBatchCampaignWithTimer);
  const cancelBatch = useQuestStore((s) => s.cancelBatchCampaignTimer);
  const toggleBatchPause = useQuestStore((s) => s.toggleBatchCampaignTimerPause);
  const syncBatchPause = useQuestStore((s) => s.syncActiveBatchCampaignPauseIfExhausted);
  const addLog = useEventStore((s) => s.addLog);

  const [phase, setPhase] = useState<CampaignPhase>(
    defaultPhase ?? "PRE_LAUNCH"
  );
  const [selectedCityIds, setSelectedCityIds] = useState<string[]>(
    () => defaultCityIds ?? []
  );
  const [timerTick, setTimerTick] = useState(() => Date.now());
  const [lastMsg, setLastMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedCityIds((prev) =>
      prev.filter((id) => territoryCities.some((c) => c.id === id))
    );
  }, [territoryCities]);

  useEffect(() => {
    if (defaultPhase) setPhase(defaultPhase);
  }, [defaultPhase]);

  useEffect(() => {
    if (!defaultCityIds?.length) return;
    const valid = defaultCityIds.filter((id) =>
      territoryCities.some((c) => c.id === id)
    );
    if (valid.length > 0) setSelectedCityIds(valid);
  }, [defaultCityIds, territoryCities]);

  useEffect(() => {
    if (!activeBatch) return;
    const id = window.setInterval(() => {
      syncBatchPause();
      setTimerTick(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeBatch, syncBatchPause]);

  const phaseQuests = useMemo(() => {
    const byPhase = filterQuestsByCampaignPhase(quests, phase);
    return byPhase
      .filter((q) => getQuestAffiliation(q) === "city")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [quests, phase]);

  const allCitiesSelected =
    territoryCities.length > 0 &&
    selectedCityIds.length === territoryCities.length;

  const toggleCity = (id: string, checked: boolean) => {
    setSelectedCityIds((prev) =>
      checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)
    );
  };

  const activeQuest = activeBatch
    ? quests.find((q) => q.id === activeBatch.questId)
    : null;

  const batchElapsedMs = activeBatch
    ? getQuestTimerEffectiveElapsedMs(activeBatch, timerTick)
    : 0;

  const batchThresholds =
    activeBatch && activeQuest
      ? computeBatchCampaignTimerThresholds(activeQuest, activeBatch.cityIds.length)
      : null;

  const onStartBatch = useCallback(
    (quest: Quest) => {
      setLastMsg(null);
      if (selectedCityIds.length === 0) {
        setLastMsg("请先勾选参战城池。");
        return;
      }
      if (activeBatch) {
        setLastMsg("尚有集群战役计时中，请先呈报或撤点卯。");
        return;
      }
      const r = startBatch(quest.id, selectedCityIds);
      if (!r.ok) {
        setLastMsg(r.reason);
        return;
      }
      addLog(
        `【集团军】${campaignPhaseLabel(phase)}·集群点卯《${quest.title.slice(0, 24)}》，${r.participantCount} 城参战（标准工时 ${r.T_standard} 分钟）。`,
        "decree"
      );
      if (r.skippedCount > 0) {
        setLastMsg(`${r.skippedCount} 座城池该任务已满或不可勘合，已跳过。`);
      }
    },
    [activeBatch, addLog, phase, selectedCityIds, startBatch]
  );

  const onCompleteBatch = useCallback(
    (questId: string) => {
      setLastMsg(null);
      const r = completeBatch(questId);
      if (r === false) {
        setLastMsg("呈报失败：无有效参战记录或计时已失效。");
        return;
      }
      if (typeof r === "object" && "shoddy" in r && r.shoddy) {
        setLastMsg("操切过急（低于批量极限工时），本次集群点卯作废，体力已退还。");
        return;
      }
      if (typeof r === "object" && "citiesCompleted" in r) {
        setLastMsg(
          `集群呈报完成：${r.citiesCompleted} 城建功，功勋合计 +${r.totalMerit}，铸券 ${r.tokensMinted} 张。`
        );
      }
    },
    [completeBatch]
  );

  return (
    <section
      className={cn(
        "rounded-xl border-2 border-imperial-gold/55 bg-slate-950/60 p-4 shadow-inner",
        "animate-imperial-gold-glow",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <Layers className="mt-0.5 h-5 w-5 shrink-0 text-imperial-gold" />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-imperial-gold">
            一键调度集团军 · 战役集群
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
            多城流水线批处理：标准工时 = 单任务耗时 × 参战城数；点卯计时中不可切换主攻。
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-imperial-gold/90">步骤 A · 战役模式</Label>
          <Select
            value={phase}
            onValueChange={(v) => setPhase(v as CampaignPhase)}
            disabled={Boolean(activeBatch)}
          >
            <SelectTrigger className="h-10 border-imperial-gold/30 bg-slate-900/80 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CAMPAIGN_PHASES.map((p) => (
                <SelectItem key={p} value={p}>
                  {campaignPhaseLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 rounded-lg border border-imperial-gold/20 bg-slate-900/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-[11px] text-imperial-gold/90">步骤 B · 参战城池</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="batch-select-all-cities"
                checked={allCitiesSelected}
                disabled={territoryCities.length === 0 || Boolean(activeBatch)}
                onCheckedChange={(v) => {
                  if (v === true) {
                    setSelectedCityIds(territoryCities.map((c) => c.id));
                  } else if (v === false) {
                    setSelectedCityIds([]);
                  }
                }}
              />
              <Label
                htmlFor="batch-select-all-cities"
                className="cursor-pointer text-[10px] text-slate-400"
              >
                全选（{territoryCities.length}）
              </Label>
            </div>
          </div>
          <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
            {territoryCities.length === 0 ? (
              <p className="text-xs text-slate-500">图志暂无征战目标。</p>
            ) : (
              territoryCities.map((c) => {
                const checked = selectedCityIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
                      checked
                        ? "border-imperial-gold/50 bg-imperial-gold/10 text-slate-100"
                        : "border-slate-700/80 bg-slate-950/60 text-slate-400 hover:border-imperial-gold/25",
                      activeBatch && "pointer-events-none opacity-60"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={Boolean(activeBatch)}
                      onCheckedChange={(v) => toggleCity(c.id, v === true)}
                      className="shrink-0"
                    />
                    <span>
                      <span className="font-medium">{c.name}</span>
                      {c.alias?.trim() ? (
                        <span className="text-slate-500"> · {c.alias.trim()}</span>
                      ) : null}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {activeBatch && activeQuest && batchThresholds ? (
          <div className="rounded-lg border border-imperial-gold/35 bg-amber-950/20 px-3 py-2.5 text-[11px] text-amber-100/95">
            <p className="font-medium text-imperial-gold">
              集群计时中 · {activeQuest.title.slice(0, 28)}
            </p>
            <p className="mt-1 tabular-nums text-slate-300">
              用时 {formatMmSs(batchElapsedMs)} / 标准{" "}
              {batchThresholds.T_standard}m · 极限 {batchThresholds.T_floor}m · 参战{" "}
              {activeBatch.cityIds.length} 城
            </p>
            <p className="mt-0.5 text-slate-500">
              暂停 {formatMmSs(getQuestTimerPauseBudgetUsedMs(activeBatch, timerTick))} /{" "}
              {formatMmSs(QUEST_TIMER_MAX_PAUSE_MS)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 border-imperial-gold/40 text-imperial-gold"
                onClick={() => toggleBatchPause(activeBatch.questId)}
              >
                {activeBatch.pauseStartedAt != null ? (
                  <>
                    <Play className="mr-1 h-3.5 w-3.5" /> 继续
                  </>
                ) : (
                  <>
                    <Pause className="mr-1 h-3.5 w-3.5" /> 暂停
                  </>
                )}
              </Button>
              {timerTick - activeBatch.startTime <= QUEST_TIMER_CANCEL_WINDOW_MS ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 text-slate-400"
                  onClick={() => {
                    if (cancelBatch(activeBatch.questId)) {
                      setLastMsg("已撤集群点卯，体力已退还。");
                    }
                  }}
                >
                  撤点卯
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="h-8 bg-primary text-primary-foreground"
                onClick={() => onCompleteBatch(activeBatch.questId)}
              >
                呈报集群战役
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label className="text-[11px] text-imperial-gold/90">
            步骤 C · 任务流水线（{phaseQuests.length}）
          </Label>
          {phaseQuests.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">
              该战役模式下暂无分城政务。请在枢密院为任务设置「战役阶段」。
            </p>
          ) : (
            <ul className="space-y-1.5">
              {phaseQuests.map((q) => {
                const n = selectedCityIds.length;
                const batchThresholds =
                  n > 0
                    ? computeBatchCampaignTimerThresholds(q, n)
                    : { T_standard: 0, T_floor: 0 };
                const { T_standard } = batchThresholds;
                const preview =
                  n > 0
                    ? resolveBatchCampaignEligibility(q, selectedCityIds, cities)
                    : null;
                const isTiming = activeBatch?.questId === q.id;
                const canStart =
                  !activeBatch &&
                  n > 0 &&
                  preview &&
                  preview.eligibleCityIds.length > 0 &&
                  stamina >= preview.totalStaminaCost;

                return (
                  <li
                    key={q.id}
                    className={cn(
                      "flex flex-wrap items-center gap-2 rounded-lg border border-slate-800/90 bg-slate-950/50 px-2.5 py-2",
                      isTiming && "border-imperial-gold/45 bg-imperial-gold/5"
                    )}
                  >
                    <Swords className="h-3.5 w-3.5 shrink-0 text-imperial-gold/80" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-100">{q.title}</p>
                      <p className="text-[10px] text-slate-500">
                        单城 {formatQuestDurationMinutes(q.minCompletionTime)} · 批量标准{" "}
                        {n > 0 ? `${T_standard}m（×${n} 城）` : "—"} · 体力{" "}
                        {q.staminaCost}/城
                        {preview && preview.eligibleCityIds.length < n ? (
                          <span className="text-amber-400/90">
                            {" "}
                            · 可参战 {preview.eligibleCityIds.length} 城
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {!isTiming ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!canStart}
                        className="h-8 shrink-0 border-imperial-gold/45 text-[11px] text-imperial-gold hover:bg-imperial-gold/10"
                        onClick={() => onStartBatch(q)}
                      >
                        集群点卯
                      </Button>
                    ) : (
                      <span className="text-[10px] text-imperial-gold">计时中…</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {lastMsg ? (
          <p className="text-[11px] leading-relaxed text-amber-200/90">{lastMsg}</p>
        ) : null}
      </div>

      <Separator className="mt-4 bg-imperial-gold/15" />
      <p className="mt-2 text-[10px] text-slate-500">
        体力 {stamina} · 已选 {selectedCityIds.length} 城
      </p>
    </section>
  );
}
