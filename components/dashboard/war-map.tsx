"use client";

import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEventHandler,
} from "react";
import { AlertTriangle, Coins, MapPinned, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { isCityEquipmentCritical } from "@/lib/city-military";
import { getTerritoryCities } from "@/lib/tongwu-si";
import { cn } from "@/lib/utils";
import {
  CITY_STATUS_LABELS,
  cityStatusCardClass,
  cityStatusDotClass,
} from "@/lib/city-status";
import type { City, CityStatus } from "@/store/types";
import { useEventStore, useMapStore, useQuestStore } from "@/store";
import { CityImperialProgress } from "./city-imperial-progress";

const STATUS_ORDER: CityStatus[] = [0, 1, 2, 3];

const fieldShell =
  "border-slate-700/80 bg-slate-900/80 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/40 focus-visible:ring-imperial-gold/30";

function sanitizeNonNegIntString(raw: string): string {
  if (raw === "" || raw === "-") return "0";
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return "0";
  return String(Math.floor(n));
}

export type WarMapProps = {
  locateCityId?: string | null;
  onLocateCityDone?: () => void;
  /** 养心殿睡衣：九州图志网格半透明遮罩并禁止点城 */
  showPajamaOverlay?: boolean;
};

export function WarMap({
  locateCityId = null,
  onLocateCityDone,
  showPajamaOverlay = false,
}: WarMapProps) {
  const cities = useMapStore((s) => s.cities);
  const territoryCities = useMemo(() => getTerritoryCities(cities), [cities]);
  const updateCity = useMapStore((s) => s.updateCity);
  const tourCityAction = useMapStore((s) => s.tourCity);
  const submitCityReport = useMapStore((s) => s.submitCityReport);
  const addLog = useEventStore((s) => s.addLog);
  const quests = useQuestStore((s) => s.quests);
  const lastLoginDate = useQuestStore((s) => s.lastLoginDate);

  const [openId, setOpenId] = useState<string | null>(null);
  const active = useMemo(
    () => cities.find((c) => c.id === openId) ?? null,
    [cities, openId]
  );

  const [draftMemo, setDraftMemo] = useState("");
  const [draftAlias, setDraftAlias] = useState("");
  const [draftCpa, setDraftCpa] = useState("0");
  const [draftOrders, setDraftOrders] = useState("0");
  const [draftTroops, setDraftTroops] = useState("0");
  const [draftEquipments, setDraftEquipments] = useState("0");
  const [draftStatus, setDraftStatus] = useState<CityStatus>(0);
  const [draftReportSpend, setDraftReportSpend] = useState("0");
  const [draftReportLeads, setDraftReportLeads] = useState("0");
  const [draftReportOrders, setDraftReportOrders] = useState("0");
  /** 征战态势多选筛选；空集表示不筛选（显示全部） */
  const [statusFilter, setStatusFilter] = useState<Set<CityStatus>>(
    () => new Set<CityStatus>([2])
  );

  const toggleStatusFilter = (st: CityStatus) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(st)) next.delete(st);
      else next.add(st);
      return next;
    });
  };

  const effectiveStatusFilter = useMemo(() => {
    if (statusFilter.size === 0) return null;
    return statusFilter;
  }, [statusFilter]);

  const visibleCities = useMemo(() => {
    if (!effectiveStatusFilter) return territoryCities;
    return territoryCities.filter((c) => effectiveStatusFilter.has(c.status));
  }, [territoryCities, effectiveStatusFilter]);

  const statusCounts = useMemo(() => {
    const m = new Map<CityStatus, number>();
    for (const st of STATUS_ORDER) m.set(st, 0);
    for (const c of territoryCities) {
      m.set(c.status, (m.get(c.status) ?? 0) + 1);
    }
    return m;
  }, [territoryCities]);

  useEffect(() => {
    if (!active) return;
    setDraftMemo(active.memo);
    setDraftAlias(active.alias ?? "");
    setDraftCpa(String(active.cpa));
    setDraftOrders(String(active.orders));
    setDraftTroops(String(active.troops));
    setDraftEquipments(String(active.equipments));
    setDraftStatus(active.status);
    setDraftReportSpend("0");
    setDraftReportLeads("0");
    setDraftReportOrders("0");
  }, [active]);

  useEffect(() => {
    if (!openId) return;
    setDraftReportSpend("0");
    setDraftReportLeads("0");
    setDraftReportOrders("0");
  }, [lastLoginDate, openId]);

  useEffect(() => {
    if (openId && !visibleCities.some((c) => c.id === openId)) {
      setOpenId(null);
    }
  }, [openId, visibleCities]);

  const close = () => setOpenId(null);

  useEffect(() => {
    if (showPajamaOverlay && openId) {
      setOpenId(null);
    }
  }, [showPajamaOverlay, openId]);

  useLayoutEffect(() => {
    if (!locateCityId) return;
    const el = document.querySelector<HTMLElement>(
      `[data-city-card="${locateCityId}"]`
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-imperial-gold", "ring-offset-2", "ring-offset-background");
    const t = window.setTimeout(() => {
      el?.classList.remove(
        "ring-2",
        "ring-imperial-gold",
        "ring-offset-2",
        "ring-offset-background"
      );
      onLocateCityDone?.();
    }, 1600);
    return () => window.clearTimeout(t);
  }, [locateCityId, onLocateCityDone]);

  const dailyBattlePreview = useMemo(() => {
    const spend = Math.max(
      0,
      Math.floor(Number.parseInt(draftReportSpend, 10) || 0)
    );
    const leads = Math.max(
      0,
      Math.floor(Number.parseInt(draftReportLeads, 10) || 0)
    );
    const orders = Math.max(
      0,
      Math.floor(Number.parseInt(draftReportOrders, 10) || 0)
    );
    const costPerLead =
      leads > 0 && spend > 0 ? spend / leads : null;
    return { spend, leads, orders, costPerLead };
  }, [draftReportSpend, draftReportLeads, draftReportOrders]);

  const save = () => {
    if (!active) return;
    const cpa = Math.max(0, Number.parseInt(draftCpa, 10) || 0);
    const orders = Math.max(0, Number.parseInt(draftOrders, 10) || 0);
    const troops = Math.max(0, Number.parseInt(draftTroops, 10) || 0);
    const equipments = Math.max(0, Number.parseInt(draftEquipments, 10) || 0);
    updateCity(active.id, {
      memo: draftMemo.trim(),
      alias: draftAlias.trim(),
      cpa,
      orders,
      troops,
      equipments,
      status: draftStatus,
    });
    addLog(`朱批已下发至【${active.name}】`, "decree");
    close();
  };

  return (
    <TooltipProvider delayDuration={200}>
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-lg font-semibold tracking-tight text-foreground">
            <MapPinned className="h-5 w-5 shrink-0 text-imperial-gold" />
            <span>九州图志</span>
            <span className="text-xs font-normal text-muted-foreground sm:text-sm">
              (The World Atlas)
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            征战目标 {cities.length} 座
            {effectiveStatusFilter ? (
              <>
                {" "}
                · 当前展示{" "}
                <span className="tabular-nums text-foreground">{visibleCities.length}</span>{" "}
                座（按所选态势）
              </>
            ) : (
              <> · 展示全部 {cities.length} 座征战目标（未选任何态势标签）</>
            )}
            {" · "}
            点选一城，右侧滑出奏折
          </p>
        </div>
        <StatusFilterBar
          selected={statusFilter}
          counts={statusCounts}
          onToggle={toggleStatusFilter}
          onFocusImperialTerritory={() => {
            setStatusFilter(new Set<CityStatus>([3]));
            addLog("圣上正在阅视帝国版图，检阅已纳之疆土。", "decree");
          }}
        />
      </div>

      <Sheet
        open={openId !== null}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <div className="relative">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 xl:grid-cols-5">
          {cities.length === 0 ? (
            <p className="col-span-full rounded-lg border border-dashed border-imperial-gold/25 bg-slate-950/40 px-4 py-10 text-center text-sm text-muted-foreground">
              暂无城池。请点击顶部「造办处」齿轮 → 图志司 → 新增城池。
            </p>
          ) : visibleCities.length === 0 ? (
            <p className="col-span-full rounded-lg border border-dashed border-imperial-gold/25 bg-slate-950/40 px-4 py-8 text-center text-sm text-muted-foreground">
              所选态势下暂无城池。请点选其它态势标签，或取消筛选以显示全部。
            </p>
          ) : (
            visibleCities.map((city) => (
              <SheetTrigger key={city.id} asChild>
                <CityTileButton
                  city={city}
                  onSelect={() => setOpenId(city.id)}
                />
              </SheetTrigger>
            ))
          )}
          </div>
          {showPajamaOverlay ? (
            <div
              className="pointer-events-auto absolute inset-0 z-20 rounded-lg bg-black/55 backdrop-blur-[1px]"
              aria-hidden
            />
          ) : null}
        </div>

        <SheetContent
          side="right"
          className={cn(
            "flex h-full max-h-dvh w-full flex-col gap-0 border-l border-imperial-gold/20 bg-slate-950 p-0 shadow-2xl",
            "sm:max-w-md md:max-w-lg"
          )}
        >
          {active && (
            <>
              <SheetHeader className="shrink-0 space-y-2 border-b border-slate-800/90 bg-slate-950 px-6 pb-4 pt-6 text-left">
                <SheetTitle className="flex flex-wrap items-center gap-3 text-left text-xl text-primary">
                  <span className="font-semibold tracking-tight">
                    {active.name}
                  </span>
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 shrink-0 rounded-sm border-2 border-slate-950 shadow-sm ring-1 ring-imperial-gold/35",
                      cityStatusDotClass(draftStatus)
                    )}
                    title={CITY_STATUS_LABELS[draftStatus]}
                    aria-hidden
                  />
                  <span className="text-sm font-normal text-muted-foreground">
                    {CITY_STATUS_LABELS[draftStatus]}
                  </span>
                </SheetTitle>
                <SheetDescription className="text-left text-slate-400">
                  批阅城池军政机要
                </SheetDescription>
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5">
                <div className="space-y-2">
                  <Label htmlFor="city-alias" className="text-slate-300">
                    别名（产品名）
                  </Label>
                  <Input
                    id="city-alias"
                    value={draftAlias}
                    onChange={(e) => setDraftAlias(e.target.value)}
                    placeholder="如：档案管理员（可在造办处统一配置）"
                    className={cn("h-10", fieldShell)}
                  />
                </div>

                <div className="mt-6 space-y-2">
                  <Label className="text-slate-300">征战态势</Label>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_ORDER.map((st) => (
                      <Button
                        key={st}
                        type="button"
                        size="sm"
                        variant={draftStatus === st ? "default" : "outline"}
                        className={cn(
                          "text-xs",
                          draftStatus === st &&
                            "bg-primary text-primary-foreground shadow-sm",
                          draftStatus !== st &&
                            "border-slate-600 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                        )}
                        onClick={() => setDraftStatus(st)}
                      >
                        {CITY_STATUS_LABELS[st]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 space-y-3 rounded-lg border border-imperial-gold/25 bg-slate-950/50 px-3 py-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="text-xs font-semibold tracking-wide text-imperial-gold">
                      今日战报 (Daily Report)
                    </h3>
                    <span className="text-[9px] text-slate-500">
                      从军费扣「今日消耗」· 累加本城度支 / 线索 / 粮饷
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label htmlFor="battle-spend" className="text-[10px] text-slate-400">
                        今日消耗 (Daily Spend)
                      </Label>
                      <Input
                        id="battle-spend"
                        type="number"
                        min={0}
                        step={1}
                        value={draftReportSpend}
                        onChange={(e) =>
                          setDraftReportSpend(sanitizeNonNegIntString(e.target.value))
                        }
                        placeholder="0"
                        className={cn("h-9 text-sm", fieldShell)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="battle-leads" className="text-[10px] text-slate-400">
                        今日加粉 (Daily Leads)
                      </Label>
                      <Input
                        id="battle-leads"
                        type="number"
                        min={0}
                        step={1}
                        value={draftReportLeads}
                        onChange={(e) =>
                          setDraftReportLeads(sanitizeNonNegIntString(e.target.value))
                        }
                        placeholder="0"
                        className={cn("h-9 text-sm", fieldShell)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="battle-orders" className="text-[10px] text-slate-400">
                        今日出单 (Daily Orders)
                      </Label>
                      <Input
                        id="battle-orders"
                        type="number"
                        min={0}
                        step={1}
                        value={draftReportOrders}
                        onChange={(e) =>
                          setDraftReportOrders(sanitizeNonNegIntString(e.target.value))
                        }
                        placeholder="0"
                        className={cn("h-9 text-sm", fieldShell)}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-400">
                    今日 CPA（本页录入）：{" "}
                    <span className="font-medium tabular-nums text-imperial-gold/90">
                      {dailyBattlePreview.spend.toLocaleString("zh-CN")}
                    </span>
                    <span className="mx-2 text-slate-600">·</span>
                    今日粉成本：
                    <span className="ml-1 font-medium tabular-nums text-sky-300/90">
                      {dailyBattlePreview.costPerLead != null
                        ? `${dailyBattlePreview.costPerLead.toLocaleString("zh-CN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })} 两/人`
                        : "—（需消耗与加粉均大于 0）"}
                    </span>
                  </p>
                  <Button
                    type="button"
                    className="min-h-[44px] w-full border-imperial-gold/50 bg-imperial-gold/15 text-imperial-gold hover:bg-imperial-gold/25"
                    onClick={() => {
                      if (!active) return;
                      const r = submitCityReport(active.id, {
                        dailySpend: dailyBattlePreview.spend,
                        dailyLeads: dailyBattlePreview.leads,
                        dailyOrders: dailyBattlePreview.orders,
                      });
                      if (!r.ok) {
                        window.alert(r.reason);
                        return;
                      }
                      setDraftReportSpend("0");
                      setDraftReportLeads("0");
                      setDraftReportOrders("0");
                    }}
                  >
                    呈报战报
                  </Button>
                </div>

                <div className="mt-5">
                  <CityImperialProgress
                    city={active}
                    quests={quests}
                    statusTone={draftStatus}
                  />
                </div>

                {active.status === 3 ? (
                  <div className="mt-5 space-y-2 rounded-lg border border-imperial-gold/20 bg-slate-950/40 px-3 py-3">
                    <Button
                      type="button"
                      className={cn(
                        "w-full border-2 border-imperial-gold/85 bg-amber-950/30 font-medium text-imperial-gold",
                        "shadow-[0_0_14px_rgba(245,158,11,0.18)] transition-all",
                        "hover:border-imperial-gold hover:bg-amber-950/50 hover:text-amber-100",
                        "hover:shadow-[0_0_22px_rgba(245,158,11,0.42)]"
                      )}
                      onClick={() => {
                        const r = tourCityAction(active.id);
                        if (!r.ok) {
                          window.alert(r.reason);
                        }
                      }}
                    >
                      巡幸疆土
                    </Button>
                    <p className="text-center text-[10px] leading-relaxed text-slate-400">
                      <span className="inline-flex items-center gap-0.5">
                        <Zap className="h-3 w-3 shrink-0 text-amber-400" aria-hidden />
                        消耗 25 体力
                      </span>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Coins className="h-3 w-3 shrink-0 text-amber-400" aria-hidden />
                        100 两
                      </span>
                      <span className="mt-1 block text-slate-500">
                        奖励 100 功勋、1 张翻牌券（多巴胺池 +15）、民心 +2
                      </span>
                    </p>
                  </div>
                ) : null}

                <div className="mt-6 space-y-2">
                  <Label htmlFor="city-memo" className="text-slate-300">
                    军机备忘（奏折）
                  </Label>
                  <Textarea
                    id="city-memo"
                    value={draftMemo}
                    onChange={(e) => setDraftMemo(e.target.value)}
                    placeholder="在此挥毫落墨，记录该城机要、风险与下一步……"
                    className={cn(
                      "min-h-[400px] resize-y text-sm leading-relaxed",
                      fieldShell
                    )}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city-cpa" className="text-slate-300">
                      度支 (CPA)
                    </Label>
                    <Input
                      id="city-cpa"
                      inputMode="numeric"
                      value={draftCpa}
                      onChange={(e) => setDraftCpa(e.target.value)}
                      className={cn("h-10", fieldShell)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city-orders" className="text-slate-300">
                      粮饷 (单)
                    </Label>
                    <Input
                      id="city-orders"
                      inputMode="numeric"
                      value={draftOrders}
                      onChange={(e) => setDraftOrders(e.target.value)}
                      className={cn("h-10", fieldShell)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city-troops" className="text-slate-300">
                      帝国兵力（关键词数）
                    </Label>
                    <Input
                      id="city-troops"
                      inputMode="numeric"
                      value={draftTroops}
                      onChange={(e) => setDraftTroops(e.target.value)}
                      className={cn("h-10", fieldShell)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city-equipments" className="text-slate-300">
                      军械装备（创意 / 高级样式）
                    </Label>
                    <Input
                      id="city-equipments"
                      inputMode="numeric"
                      value={draftEquipments}
                      onChange={(e) => setDraftEquipments(e.target.value)}
                      className={cn("h-10", fieldShell)}
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 border-t border-imperial-gold/15 bg-slate-950/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    onClick={close}
                  >
                    退朝（取消）
                  </Button>
                  <Button
                    type="button"
                    className="bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                    onClick={save}
                  >
                    朱批（保存修改）
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </section>
    </TooltipProvider>
  );
}

function StatusFilterBar({
  selected,
  counts,
  onToggle,
  onFocusImperialTerritory,
}: {
  selected: Set<CityStatus>;
  counts: Map<CityStatus, number>;
  onToggle: (st: CityStatus) => void;
  onFocusImperialTerritory: () => void;
}) {
  return (
    <div className="flex max-w-full flex-col items-stretch gap-1.5 sm:max-w-[32rem] sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-amber-700/55 bg-amber-950/35 text-[10px] font-medium text-amber-200 shadow-sm ring-1 ring-amber-600/20 hover:bg-amber-950/55 hover:text-amber-100 sm:text-xs"
          onClick={onFocusImperialTerritory}
        >
          查看帝国版图
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground sm:text-right">
        态势筛选（可多选；全部取消则显示全部征战目标）
      </p>
      <div className="flex flex-wrap gap-1.5 sm:justify-end">
        {STATUS_ORDER.map((st) => {
          const on = selected.has(st);
          const n = counts.get(st) ?? 0;
          return (
            <button
              key={st}
              type="button"
              onClick={() => onToggle(st)}
              className={cn(
                "inline-flex min-h-[32px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium transition sm:min-h-0 sm:text-xs",
                on
                  ? "border-imperial-gold/70 bg-imperial-gold/15 text-imperial-gold shadow-sm ring-1 ring-imperial-gold/25"
                  : "border-border/60 bg-slate-950/50 text-muted-foreground hover:border-imperial-gold/35 hover:text-foreground"
              )}
              aria-pressed={on}
            >
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", cityStatusDotClass(st))}
                aria-hidden
              />
              <span>{CITY_STATUS_LABELS[st]}</span>
              <span className="tabular-nums text-[9px] opacity-80 sm:text-[10px]">({n})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CityTileButton = forwardRef<
  HTMLButtonElement,
  Omit<ComponentPropsWithoutRef<"button">, "onClick"> & {
    city: City;
    onSelect: () => void;
    onClick?: MouseEventHandler<HTMLButtonElement>;
  }
>(function CityTileButton(
  { city, onSelect, onClick, className, ...rest },
  ref
) {
  const equipCritical = isCityEquipmentCritical(city);
  return (
    <button
      ref={ref}
      type="button"
      data-city-card={city.id}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border p-2.5 pr-7 text-left shadow-sm transition",
        "hover:ring-1 hover:ring-imperial-gold/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        cityStatusCardClass(city.status),
        city.status === 3 &&
          "border-imperial-gold shadow-[0_0_15px_rgba(245,158,11,0.5)] animate-imperial-gold-glow",
        className
      )}
      onClick={(e) => {
        onSelect();
        onClick?.(e);
      }}
      {...rest}
    >
      {city.status !== 3 ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] rounded-lg bg-slate-950/45 ring-1 ring-inset ring-slate-700/25"
        />
      ) : null}
      <span
        className={cn(
          "relative z-[2] flex min-h-0 w-full flex-col",
          city.status !== 3 && "opacity-[0.88] saturate-[0.72]"
        )}
      >
      <div className="flex items-start justify-between gap-1">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {city.name}
        </span>
        <div className="absolute right-1.5 top-1.5 flex shrink-0 items-center gap-0.5">
          {equipCritical ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  role="img"
                  aria-label="军备不足警告"
                  className="inline-flex rounded p-0.5 text-rose-500 hover:bg-rose-950/50 hover:text-rose-400"
                  tabIndex={0}
                  onClick={(e) => e.stopPropagation()}
                >
                  <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="max-w-[min(18rem,calc(100vw-2rem))] border-rose-500/40 bg-rose-950 text-rose-50"
              >
                军备严重不足，战力腰斩，请速派工部打造军械！
              </TooltipContent>
            </Tooltip>
          ) : null}
          <span
            className={cn(
              "mt-0.5 h-2 w-2 shrink-0 rounded-full",
              cityStatusDotClass(city.status)
            )}
            title={CITY_STATUS_LABELS[city.status]}
          />
        </div>
      </div>
      {city.alias?.trim() ? (
        <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500 sm:text-xs">
          {city.alias}
        </p>
      ) : null}
      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] opacity-90 sm:text-xs">
        <span>度支 (CPA) {city.cpa}</span>
        <span className="text-right">粮饷 (单) {city.orders}</span>
        <span className="col-span-2 text-slate-400">
          线索 (粉) {Math.max(0, Math.floor(city.leads ?? 0))}
        </span>
        <span>兵 {city.troops}</span>
        <span className="text-right">械 {city.equipments}</span>
      </div>
      {city.memo ? (
        <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground sm:text-xs">
          {city.memo}
        </p>
      ) : (
        <p className="mt-1 text-[10px] italic text-muted-foreground/70 sm:text-xs">
          无备忘
        </p>
      )}
      </span>
    </button>
  );
});
CityTileButton.displayName = "CityTileButton";
