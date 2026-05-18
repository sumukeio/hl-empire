"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GripVertical, Pause, Play, Swords } from "lucide-react";

import { CampaignClusterIcon } from "@/components/icons/campaign-cluster-icon";

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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CAMPAIGN_PHASES,
  campaignPhaseLabel,
  filterQuestsByCampaignPhase,
  getQuestCampaignPhase,
} from "@/lib/campaign-phase";
import {
  computeBatchCampaignTimerThresholds,
  getBatchStartBlockReason,
  resolveBatchCampaignEligibility,
} from "@/lib/batch-campaign";
import { getQuestAffiliation } from "@/lib/quest-affiliation";
import {
  getTerritoryCities,
  sortTerritoryCitiesForDisplay,
} from "@/lib/tongwu-si";
import { touchInput, touchTargetInline } from "@/lib/mobile-ui";
import { cn } from "@/lib/utils";
import {
  getQuestTimerEffectiveElapsedMs,
  getQuestTimerPauseBudgetUsedMs,
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
  const activeTimer = useQuestStore((s) => s.activeTimer);
  const activeBatch = useQuestStore((s) => s.activeBatchCampaign);
  const startBatch = useQuestStore((s) => s.startBatchCampaignQuest);
  const reorderPhaseQuests = useQuestStore((s) => s.reorderCampaignPhaseQuests);
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
  const [dragQuestId, setDragQuestId] = useState<string | null>(null);

  const displayTerritoryCities = useMemo(
    () => sortTerritoryCitiesForDisplay(territoryCities),
    [territoryCities]
  );

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

  const handlePipelineDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragQuestId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handlePipelineDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handlePipelineDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("text/plain");
      const dragId = raw || dragQuestId;
      setDragQuestId(null);
      if (!dragId || dragId === targetId || activeBatch) return;
      const ordered = phaseQuests.map((q) => q.id);
      const from = ordered.indexOf(dragId);
      const to = ordered.indexOf(targetId);
      if (from < 0 || to < 0) return;
      const next = [...ordered];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      reorderPhaseQuests(phase, next);
    },
    [activeBatch, dragQuestId, phase, phaseQuests, reorderPhaseQuests]
  );

  const handlePipelineDragEnd = useCallback(() => {
    setDragQuestId(null);
  }, []);

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
      const preview = resolveBatchCampaignEligibility(
        quest,
        selectedCityIds,
        cities
      );
      const blockReason = getBatchStartBlockReason({
        activeBatch,
        activeTimer,
        selectedCount: selectedCityIds.length,
        preview,
        stamina,
      });
      if (blockReason) {
        setLastMsg(blockReason);
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
    [
      activeBatch,
      activeTimer,
      addLog,
      cities,
      phase,
      selectedCityIds,
      stamina,
      startBatch,
    ]
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
    <TooltipProvider delayDuration={200}>
    <section
      className={cn(
        "rounded-xl border-2 border-imperial-gold/55 bg-slate-950/60 p-4 shadow-inner",
        "animate-imperial-gold-glow",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <CampaignClusterIcon className="mt-0.5 text-imperial-gold" />
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
            <SelectTrigger
              className={cn(
                "border-imperial-gold/30 bg-slate-900/80 text-sm",
                touchInput
              )}
            >
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
              displayTerritoryCities.map((c) => {
                const checked = selectedCityIds.includes(c.id);
                return (
                  <label
                    key={c.id}
                    className={cn(
                      "flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[11px] transition-colors",
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
                className={cn(
                  "border-imperial-gold/40 text-imperial-gold",
                  touchTargetInline
                )}
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
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn("text-slate-400", touchTargetInline)}
                title="撤本次集群点卯并退还体力"
                onClick={() => {
                  if (cancelBatch(activeBatch.questId)) {
                    setLastMsg("已撤集群点卯，体力已退还。");
                  }
                }}
              >
                撤点卯
              </Button>
              <Button
                type="button"
                size="sm"
                className={cn(
                  "bg-primary text-primary-foreground",
                  touchTargetInline
                )}
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
            {!activeBatch && phaseQuests.length > 1 ? (
              <span className="ml-1 font-normal text-slate-500">
                · 大屏左侧把手可拖动排序
              </span>
            ) : null}
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
                const blockReason = getBatchStartBlockReason({
                  activeBatch,
                  activeTimer,
                  selectedCount: n,
                  preview,
                  stamina,
                });
                const canStart = blockReason === null;

                return (
                  <li
                    key={q.id}
                    className={cn(
                      "flex flex-wrap items-center gap-2 rounded-lg border border-slate-800/90 bg-slate-950/50 px-2.5 py-2",
                      isTiming && "border-imperial-gold/45 bg-imperial-gold/5",
                      dragQuestId === q.id && "opacity-60"
                    )}
                    onDragOver={handlePipelineDragOver}
                    onDrop={(e) => handlePipelineDrop(e, q.id)}
                    onDragEnd={handlePipelineDragEnd}
                  >
                    {!activeBatch ? (
                      <div
                        className="hidden shrink-0 cursor-grab items-center active:cursor-grabbing sm:flex"
                        draggable
                        onDragStart={(e) => handlePipelineDragStart(e, q.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`拖动排序：${q.title}`}
                        title="拖动调整流水线顺序"
                      >
                        <GripVertical className="h-4 w-4 text-slate-600" />
                      </div>
                    ) : (
                      <span className="w-4 shrink-0" aria-hidden />
                    )}
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
                      {blockReason && !isTiming ? (
                        <p
                          className="mt-1 text-[10px] leading-snug text-amber-400/95"
                          role="status"
                        >
                          {blockReason}
                        </p>
                      ) : null}
                    </div>
                    {!isTiming ? (
                      <div className="flex min-w-[5.5rem] shrink-0 flex-col items-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={cn(
                                "inline-flex",
                                !canStart && "cursor-not-allowed"
                              )}
                              tabIndex={canStart ? -1 : 0}
                              role={canStart ? undefined : "button"}
                              aria-label={
                                blockReason
                                  ? `集群点卯不可用：${blockReason}`
                                  : "集群点卯"
                              }
                              onClick={() => {
                                if (!canStart && blockReason) {
                                  setLastMsg(blockReason);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (
                                  !canStart &&
                                  blockReason &&
                                  (e.key === "Enter" || e.key === " ")
                                ) {
                                  e.preventDefault();
                                  setLastMsg(blockReason);
                                }
                              }}
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={!canStart}
                                className={cn(
                                  "border-imperial-gold/45 text-[11px] text-imperial-gold hover:bg-imperial-gold/10",
                                  touchTargetInline,
                                  !canStart && "pointer-events-none opacity-55"
                                )}
                                onClick={() => onStartBatch(q)}
                              >
                                集群点卯
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {blockReason ? (
                            <TooltipContent
                              side="left"
                              className="max-w-[16rem] text-xs leading-relaxed"
                            >
                              {blockReason}
                            </TooltipContent>
                          ) : null}
                        </Tooltip>
                      </div>
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
    </TooltipProvider>
  );
}
