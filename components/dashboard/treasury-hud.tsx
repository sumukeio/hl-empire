"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Compass,
  Coins,
  Crown,
  Landmark,
  MapPinned,
  Radio,
  ScrollText,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";

import { EventLogPanel } from "@/components/dashboard/event-log-docket";
import { CampaignClusterIcon } from "@/components/icons/campaign-cluster-icon";
import { AscensionLadderDialog } from "@/components/dashboard/ascension-ladder-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { getEmperorTitleProgress } from "@/lib/emperor-title";
import { cn } from "@/lib/utils";
import type { City, PersonalExpenseCategory } from "@/store/types";
import { useEmperorStore, useMapStore, useQuestStore } from "@/store";

function sumCpa(cities: City[]): number {
  return cities.reduce((s, c) => s + (Number.isFinite(c.cpa) ? c.cpa : 0), 0);
}

function sumOrders(cities: City[]): number {
  return cities.reduce((s, c) => s + (Number.isFinite(c.orders) ? c.orders : 0), 0);
}

function EmpireBriefingStrip({ className }: { className?: string }) {
  const cities = useMapStore((s) => s.cities);
  const quests = useQuestStore((s) => s.quests);
  const isNomadMode = useEmperorStore((s) => s.isNomadMode);

  const { nCity, nQuest, totalOrders, totalCpa } = useMemo(() => {
    const nCity = cities.length;
    return {
      nCity,
      nQuest: quests.length,
      totalOrders: sumOrders(cities),
      totalCpa: sumCpa(cities),
    };
  }, [cities, quests]);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400 sm:text-xs",
        className
      )}
    >
      <span className="inline-flex items-center gap-1 text-slate-300">
        <Landmark className="h-3.5 w-3.5 shrink-0 text-imperial-gold" />
        征战目标{" "}
        <strong className="tabular-nums text-slate-100">{nCity}</strong> 座
      </span>
      <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
      <span className="inline-flex items-center gap-1 text-slate-300">
        <Radio className="h-3.5 w-3.5 shrink-0 text-imperial-gold" />
        军机 <strong className="tabular-nums text-slate-100">{nQuest}</strong> 务
      </span>
      <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
      <span className="tabular-nums text-slate-400">
        粮饷总额 <strong className="text-slate-200">{totalOrders}</strong>
      </span>
      <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
      <span className="tabular-nums text-slate-400">
        户部度支 <strong className="text-slate-200">{totalCpa}</strong>
      </span>
      {isNomadMode ? (
        <>
          <span className="hidden h-3 w-px bg-slate-700 sm:inline" aria-hidden />
          <span
            className="inline-flex items-center gap-1 rounded border border-imperial-gold/40 bg-imperial-gold/10 px-2 py-0.5 text-[10px] font-medium text-imperial-gold"
            title="移动行宫：军机处 MVA 模板任务功勋 +20%"
          >
            ⛺ 移动行宫
          </span>
        </>
      ) : null}
    </div>
  );
}

const vaultBtn =
  "min-h-[44px] w-full border-imperial-gold/55 bg-imperial-gold/15 text-imperial-gold hover:bg-imperial-gold/28 hover:text-imperial-gold";

const PERSONAL_EXPENSE_CHIPS: {
  id: PersonalExpenseCategory;
  label: string;
}[] = [
  { id: "imperial_provisions", label: "御膳" },
  { id: "wardrobe", label: "常服" },
  { id: "digital_gear", label: "利器" },
  { id: "infrastructure", label: "基建" },
  { id: "imperial_travel", label: "问道" },
];

const expenseChipBase =
  "h-auto min-h-[44px] flex-1 border border-imperial-gold/45 bg-slate-900/60 px-3 py-2 text-[11px] font-medium text-imperial-gold/95 shadow-sm hover:bg-imperial-gold/10 sm:min-h-[40px] sm:px-2";
const expenseChipActive =
  "border-imperial-gold/70 bg-imperial-gold/15 shadow-md ring-2 ring-imperial-gold/40";

export function TreasuryHUD() {
  const cities = useMapStore((s) => s.cities);
  const exp = useEmperorStore((s) => s.exp);
  const level = useEmperorStore((s) => s.level);
  const gold = useEmperorStore((s) => s.gold);
  const militaryFunds = useEmperorStore((s) => s.militaryFunds);
  const troops = useEmperorStore((s) => s.troops);
  const injectGold = useEmperorStore((s) => s.injectGold);
  const syncGold = useEmperorStore((s) => s.syncGold);
  const allocateFunds = useEmperorStore((s) => s.allocateFunds);
  const recordExpense = useEmperorStore((s) => s.recordExpense);
  const [docketOpen, setDocketOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [militaryOpen, setMilitaryOpen] = useState(false);
  const [injectInput, setInjectInput] = useState("");
  const [syncInput, setSyncInput] = useState("");
  const [allocateMilitaryInput, setAllocateMilitaryInput] = useState("");
  const [vaultTab, setVaultTab] = useState("ledger");
  const [personalCategory, setPersonalCategory] =
    useState<PersonalExpenseCategory>("infrastructure");
  const [personalAmount, setPersonalAmount] = useState("");
  const [cornerstone, setCornerstone] = useState(false);
  const [travelDest, setTravelDest] = useState("");
  const [ascensionOpen, setAscensionOpen] = useState(false);

  useEffect(() => {
    if (!vaultOpen) {
      setInjectInput("");
      setSyncInput("");
      setVaultTab("ledger");
      setPersonalAmount("");
      setPersonalCategory("infrastructure");
      setCornerstone(false);
      setTravelDest("");
    }
  }, [vaultOpen]);

  useEffect(() => {
    if (!militaryOpen) {
      setAllocateMilitaryInput("");
    }
  }, [militaryOpen]);

  const titleProgress = useMemo(() => getEmperorTitleProgress(exp), [exp]);
  const { tier, nextTier, pctInCurrentTier, expToNextThreshold, isApex } =
    titleProgress;

  const { nImperialTerritory, nCityTotal } = useMemo(() => {
    const nCityTotal = cities.length;
    const nImperialTerritory = cities.filter((c) => c.status === 3).length;
    return { nImperialTerritory, nCityTotal };
  }, [cities]);

  const personalExpensePreview = useMemo(() => {
    const parts: string[] = [];
    switch (personalCategory) {
      case "imperial_provisions":
        parts.push("预计增加：+20 体力（大内辎重·食补）");
        break;
      case "digital_gear":
        parts.push("预计增加：+5 文学修养（工部利器·数码）");
        break;
      case "wardrobe":
        parts.push("预计增加：+5 民心（尚衣监·服饰）");
        break;
      case "imperial_travel":
        parts.push(
          "预计增加：+10 文学修养、+5 多巴胺池（九州问道·考察旅行）"
        );
        break;
      case "infrastructure":
        parts.push("预计：仅支用国库银两（其它基建，无额外属性加成）");
        break;
      default:
        break;
    }
    if (cornerstone) {
      parts.push("万世基石：+2 民心；邸报附「（镇国利器）」");
    }
    return parts;
  }, [personalCategory, cornerstone]);

  return (
    <TooltipProvider delayDuration={200}>
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md",
          "supports-[backdrop-filter]:bg-background/70",
          "pt-[max(0.75rem,env(safe-area-inset-top))]"
        )}
      >
        <div className="mx-auto max-w-[1600px] px-3 pb-3 pt-0 sm:px-4 sm:pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setAscensionOpen(true)}
                className={cn(
                  "flex h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-primary transition-colors",
                  "hover:border-imperial-gold/55 hover:bg-imperial-gold/15 hover:text-imperial-gold",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-imperial-gold/40"
                )}
                aria-label="打开万世基业图谱（十二阶位阶）"
                title="万世基业图谱"
              >
                <Crown className="h-5 w-5" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="shrink-0 text-xs font-medium text-muted-foreground sm:text-sm">
                    位阶「{tier.level}」
                  </span>
                  <h1 className="min-w-0 truncate text-base font-semibold tracking-tight text-imperial-gold/95 drop-shadow-[0_0_10px_rgba(212,175,55,0.18)] sm:text-lg">
                    {tier.title}
                  </h1>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    Lv.{level} · 累计 {exp} 功勋
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3 align-text-bottom text-imperial-gold/80" />
                  {isApex ? (
                    <>
                      已达当今尊号之巅；位阶「{tier.level}」、尊号{" "}
                      <span className="font-medium text-imperial-gold/90">
                        {tier.title}
                      </span>
                      。
                    </>
                  ) : nextTier && expToNextThreshold != null ? (
                    <>
                      距晋升「
                      <span className="font-medium text-imperial-gold/90">
                        {nextTier.title}
                      </span>
                      」还需{" "}
                      <span className="tabular-nums text-foreground">
                        {expToNextThreshold}
                      </span>{" "}
                      功勋
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="min-w-0 flex-[1.1] lg:max-w-xl lg:px-2">
              <EmpireBriefingStrip className="w-full" />
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
              <div className="flex flex-wrap items-center gap-2">
              <Dialog open={vaultOpen} onOpenChange={setVaultOpen}>
                <button
                  type="button"
                  onClick={() => setVaultOpen(true)}
                  className={cn(
                    "flex min-h-[44px] min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-slate-800/90 bg-slate-950/50 px-2.5 py-1.5 text-left text-sm transition-colors",
                    "hover:border-imperial-gold/40 hover:bg-slate-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-imperial-gold/35"
                  )}
                  title="户部司帑：登记岁入与校准国库"
                  aria-label="打开户部司帑（国库管理）"
                >
                  <Coins className="h-4 w-4 shrink-0 text-imperial-gold" aria-hidden />
                  <span className="tabular-nums text-foreground">
                    {gold.toLocaleString("zh-CN")}
                  </span>
                  <span className="text-xs text-muted-foreground">💰 国库储蓄</span>
                </button>
                <DialogContent className="max-h-[min(92dvh,40rem)] w-[calc(100vw-1.25rem)] max-w-md overflow-y-auto border-imperial-gold/20 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100 sm:w-full sm:max-w-md sm:rounded-lg sm:p-6 sm:pb-6">
                  <DialogHeader>
                    <DialogTitle className="text-primary">户部司帑</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      岁入与校准、个人支用（人民币与国库银两 1:1 入账）。
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs
                    value={vaultTab}
                    onValueChange={setVaultTab}
                    className="px-1 pb-2 pt-1"
                  >
                    <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg border border-slate-800/90 bg-slate-900/80 p-1">
                      <TabsTrigger
                        value="ledger"
                        className="min-h-[44px] text-xs data-[state=active]:bg-imperial-gold/20 data-[state=active]:text-imperial-gold data-[state=active]:shadow-md"
                      >
                        岁入与校准
                      </TabsTrigger>
                      <TabsTrigger
                        value="personal"
                        className="min-h-[44px] text-xs data-[state=active]:bg-imperial-gold/20 data-[state=active]:text-imperial-gold data-[state=active]:shadow-md"
                      >
                        个人支用
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="ledger" className="mt-4 space-y-6">
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="vault-inject" className="text-xs text-slate-400">
                            入账工资/补贴
                          </Label>
                          <Input
                            id="vault-inject"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            placeholder="银两数额"
                            value={injectInput}
                            onChange={(e) => setInjectInput(e.target.value)}
                            className="border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 focus-visible:ring-imperial-gold/25"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className={vaultBtn}
                          onClick={() => {
                            const n = Math.max(
                              0,
                              Math.floor(Number.parseFloat(injectInput) || 0)
                            );
                            if (n <= 0) return;
                            injectGold(n);
                            setInjectInput("");
                          }}
                        >
                          准奏
                        </Button>
                      </div>
                      <Separator className="bg-imperial-gold/15" />
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="vault-sync" className="text-xs text-slate-400">
                            当前现金实存
                          </Label>
                          <Input
                            id="vault-sync"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            step={1}
                            placeholder="校准为…"
                            value={syncInput}
                            onChange={(e) => setSyncInput(e.target.value)}
                            className="border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 focus-visible:ring-imperial-gold/25"
                          />
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            由于日常生活消耗，建议每周校准一次，确保虚实对齐。
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className={vaultBtn}
                          onClick={() => {
                            const raw = syncInput.trim();
                            if (raw === "") return;
                            const n = Math.floor(Number.parseFloat(syncInput) || 0);
                            if (!Number.isFinite(n)) return;
                            syncGold(Math.max(0, n));
                            setSyncInput("");
                            setVaultOpen(false);
                          }}
                        >
                          校准
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="personal" className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 text-[11px] font-medium text-slate-400">
                          支用分类
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {PERSONAL_EXPENSE_CHIPS.map((c) => (
                            <Button
                              key={c.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(
                                expenseChipBase,
                                personalCategory === c.id && expenseChipActive
                              )}
                              onClick={() => setPersonalCategory(c.id)}
                            >
                              {c.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="personal-amount" className="text-xs text-slate-400">
                          消费金额（人民币，1:1 记为银两）
                        </Label>
                        <Input
                          id="personal-amount"
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={1}
                          placeholder="0"
                          value={personalAmount}
                          onChange={(e) => setPersonalAmount(e.target.value)}
                          className="border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 focus-visible:ring-imperial-gold/25"
                        />
                      </div>
                      {personalCategory === "imperial_travel" ? (
                        <div className="space-y-1.5">
                          <Label htmlFor="travel-dest" className="text-xs text-slate-400">
                            考察地点（邸报用语）
                          </Label>
                          <Input
                            id="travel-dest"
                            placeholder="如：洛阳、江南、京师…"
                            value={travelDest}
                            onChange={(e) => setTravelDest(e.target.value)}
                            className="border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 focus-visible:ring-imperial-gold/25"
                          />
                        </div>
                      ) : null}
                      <div className="flex items-start gap-3 rounded-md border border-imperial-gold/20 bg-slate-900/50 px-3 py-2.5">
                        <Checkbox
                          id="cornerstone"
                          checked={cornerstone}
                          onCheckedChange={(v) => setCornerstone(v === true)}
                          className="mt-0.5 border-imperial-gold/60 data-[state=checked]:bg-imperial-gold data-[state=checked]:text-slate-950"
                        />
                        <Label
                          htmlFor="cornerstone"
                          className="cursor-pointer text-left text-[11px] leading-snug text-slate-300"
                        >
                          <span className="font-semibold text-imperial-gold">
                            万世基石
                          </span>
                          <span className="mt-1 block font-normal text-slate-400">
                            此物极致性价比且预计使用 5–10 年
                          </span>
                        </Label>
                      </div>
                      <div className="rounded-md border border-slate-800/90 bg-slate-900/40 px-3 py-2 text-[11px] leading-relaxed text-sky-200/90">
                        {personalExpensePreview.map((line, i) => (
                          <p key={`${i}-${line.slice(0, 12)}`}>{line}</p>
                        ))}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className={vaultBtn}
                        onClick={() => {
                          const n = Math.max(
                            0,
                            Math.floor(Number.parseFloat(personalAmount) || 0)
                          );
                          if (n <= 0) return;
                          const ok = recordExpense({
                            amount: n,
                            category: personalCategory,
                            cornerstone,
                            travelDestination: travelDest.trim() || undefined,
                          });
                          if (!ok) {
                            window.alert("国库银两不足，无法支用此数。");
                            return;
                          }
                          setPersonalAmount("");
                          setCornerstone(false);
                          setTravelDest("");
                          setVaultOpen(false);
                        }}
                      >
                        准予调拨
                      </Button>
                    </TabsContent>
                  </Tabs>
                  </DialogContent>
                </Dialog>
              <Dialog open={militaryOpen} onOpenChange={setMilitaryOpen}>
                <button
                  type="button"
                  onClick={() => setMilitaryOpen(true)}
                  className={cn(
                    "flex min-h-[44px] min-w-0 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-900/50 bg-emerald-950/35 px-2.5 py-1.5 text-left text-sm transition-colors",
                    "hover:border-emerald-500/45 hover:bg-emerald-950/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35"
                  )}
                  title="从国库拨付至军费（百度余额）"
                  aria-label="打开拨付军费"
                >
                  <span className="text-base leading-none" aria-hidden>
                    🌾
                  </span>
                  <span className="tabular-nums text-foreground">
                    {militaryFunds.toLocaleString("zh-CN")}
                  </span>
                  <span className="text-xs text-muted-foreground">军费余额</span>
                </button>
                <DialogContent className="max-h-[min(92dvh,40rem)] w-[calc(100vw-1.25rem)] max-w-md overflow-y-auto border-emerald-800/30 bg-slate-950 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-slate-100 sm:w-full sm:max-w-md sm:rounded-lg sm:p-6 sm:pb-6">
                  <DialogHeader>
                    <DialogTitle className="text-emerald-400">拨付军费</DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      从「国库储蓄」划转至「军费余额」；御案确认后即时入账并邸报。
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 px-1 pb-2 pt-1">
                    <div className="space-y-1.5">
                      <Label htmlFor="military-allocate" className="text-xs text-slate-400">
                        拨付银两
                      </Label>
                      <Input
                        id="military-allocate"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={1}
                        placeholder="数额"
                        value={allocateMilitaryInput}
                        onChange={(e) => setAllocateMilitaryInput(e.target.value)}
                        className="border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-emerald-500/45 focus-visible:ring-emerald-500/25"
                      />
                      <p className="text-[11px] text-slate-500">
                        当前国库{" "}
                        <span className="tabular-nums text-slate-300">
                          {gold.toLocaleString("zh-CN")}
                        </span>{" "}
                        两 · 当前军费{" "}
                        <span className="tabular-nums text-emerald-300/90">
                          {militaryFunds.toLocaleString("zh-CN")}
                        </span>{" "}
                        两
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-[44px] w-full border-emerald-600/55 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50 hover:text-emerald-50"
                      onClick={() => {
                        const n = Math.max(
                          0,
                          Math.floor(Number.parseFloat(allocateMilitaryInput) || 0)
                        );
                        if (n <= 0) return;
                        const ok = allocateFunds(n);
                        if (!ok) {
                          window.alert("国库银两不足，无法拨付此数。");
                          return;
                        }
                        setAllocateMilitaryInput("");
                        setMilitaryOpen(false);
                      }}
                    >
                      御笔亲批（确认拨付）
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
              <div
                className="flex min-h-[44px] min-w-0 items-center gap-1.5 rounded-md border border-amber-900/45 bg-gradient-to-br from-amber-950/35 via-slate-950/60 to-slate-950/50 px-2.5 py-1.5 text-sm shadow-[inset_0_1px_0_rgba(251,191,36,0.08)] ring-1 ring-amber-800/25"
                title="帝国疆域 Imperial Territory：金色藩属（status 3）占征战目标之比"
                aria-label={`已纳疆土 ${nImperialTerritory} 城，征战目标共 ${nCityTotal} 城`}
              >
                <MapPinned
                  className="h-4 w-4 shrink-0 text-amber-500/90"
                  aria-hidden
                />
                <span className="tabular-nums">
                  <span className="font-semibold text-amber-300 tabular-nums drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]">
                    {nImperialTerritory}
                  </span>
                  <span className="text-slate-500"> / {nCityTotal}</span>
                  <span className="text-slate-400"> 城</span>
                </span>
                <span className="text-xs text-muted-foreground">已纳疆土</span>
              </div>
              <div className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-slate-800/90 bg-slate-950/50 px-2.5 py-1.5 text-sm">
                <Shield
                  className="h-4 w-4 shrink-0 text-imperial-vermilion"
                  aria-hidden
                />
                <span className="tabular-nums text-foreground">
                  {troops.toLocaleString("zh-CN")}
                </span>
                <span className="text-xs text-muted-foreground">军力</span>
              </div>

              <Dialog open={docketOpen} onOpenChange={setDocketOpen}>
                <DialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 border-imperial-vermilion/35 text-imperial-vermilion hover:bg-imperial-vermilion/10"
                    aria-label="八百里加急（邸报）"
                    title="八百里加急（邸报）"
                  >
                    <ScrollText className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[min(85dvh,32rem)] w-[min(24rem,calc(100vw-2rem))] max-w-lg gap-0 overflow-hidden p-0 sm:rounded-lg">
                  <DialogHeader className="sr-only">
                    <DialogTitle>八百里加急</DialogTitle>
                    <DialogDescription>邸报列表；军机勘合可逐条撤回并回滚体力与功勋</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[min(85dvh,32rem)] overflow-y-auto p-4">
                    <EventLogPanel className="border-0 shadow-none" />
                  </div>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10"
                    asChild
                  >
                    <Link href="/dashboard/activity" aria-label="勤政录（起居注）">
                      <CalendarDays className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  勤政录：按日 / 周 / 月查看邸报并导出
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 border-imperial-gold/50 text-imperial-gold hover:bg-imperial-gold/15"
                    asChild
                  >
                    <Link
                      href="/dashboard/grand-tour"
                      aria-label="巡游四海 · 行在舆图"
                    >
                      <Compass className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  巡游四海：钦定行程 · 汇总用度
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 border-imperial-gold/50 text-imperial-gold hover:bg-imperial-gold/15"
                    asChild
                  >
                    <Link
                      href="/dashboard/campaign"
                      aria-label="集团军 · 战役集群"
                    >
                      <CampaignClusterIcon className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  集团军：多城战役流水线与集群点卯
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-11 min-h-[44px] w-11 min-w-[44px] shrink-0 border-imperial-gold/35 text-imperial-gold hover:bg-imperial-gold/10"
                    asChild
                  >
                    <Link href="/settings" aria-label="造办处 (系统配置)">
                      <Settings className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  造办处 (系统配置)
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="mt-3 border-t border-border/50 pt-3">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground sm:text-[11px]">
              <span className="font-medium text-muted-foreground/90">
                位阶内进度
              </span>
              <span className="tabular-nums text-foreground/90">
                {isApex ? (
                  <>已满阶 · {exp.toLocaleString("zh-CN")} 功勋</>
                ) : titleProgress.nextThreshold != null ? (
                  <>
                    {exp.toLocaleString("zh-CN")} /{" "}
                    {titleProgress.nextThreshold.toLocaleString("zh-CN")} 功勋（
                    {pctInCurrentTier}%）
                  </>
                ) : null}
              </span>
            </div>
            <Progress
              value={isApex ? 100 : pctInCurrentTier}
              className="h-2 border border-imperial-gold/15 bg-slate-900/70"
              indicatorClassName="bg-gradient-to-r from-amber-800/95 via-imperial-gold to-amber-600/90"
            />
          </div>
        </div>
      </header>
      <AscensionLadderDialog
        open={ascensionOpen}
        onOpenChange={setAscensionOpen}
        exp={exp}
      />
    </TooltipProvider>
  );
}
