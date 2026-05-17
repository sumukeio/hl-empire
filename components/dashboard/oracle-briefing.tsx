"use client";

import { useEffect, useMemo, useRef } from "react";
import { Landmark, Radio, Scale, Siren, Sparkles, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTaels } from "@/lib/format-taels";
import { cn } from "@/lib/utils";
import { todayKey } from "@/lib/today-key";
import type { City } from "@/store/types";
import { useEventStore, useMapStore, usePrefsStore } from "@/store";

const EFFICIENCY_WARN_THRESHOLD = 35;
const CPA_RISK_THRESHOLD = 150;

function sumCpa(cities: City[]): number {
  return cities.reduce((s, c) => s + (Number.isFinite(c.cpa) ? c.cpa : 0), 0);
}

function sumOrders(cities: City[]): number {
  return cities.reduce((s, c) => s + (Number.isFinite(c.orders) ? c.orders : 0), 0);
}

function topCityByOrders(cities: City[]): City | null {
  if (!cities.length) return null;
  let best = cities[0];
  for (const c of cities) {
    if (c.orders > best.orders) best = c;
  }
  return best.orders > 0 ? best : null;
}

function riskCities(cities: City[]): City[] {
  return cities.filter((c) => c.cpa > CPA_RISK_THRESHOLD && c.orders === 0);
}

export type OracleBriefingProps = {
  onLocateCity: (cityId: string) => void;
};

export function OracleBriefing({ onLocateCity }: OracleBriefingProps) {
  const cities = useMapStore((s) => s.cities);
  const addLog = useEventStore((s) => s.addLog);

  const totalSpend = useMemo(() => sumCpa(cities), [cities]);
  const totalOrders = useMemo(() => sumOrders(cities), [cities]);
  const avgCpa =
    totalOrders === 0 ? null : totalSpend / totalOrders;
  const top = useMemo(() => topCityByOrders(cities), [cities]);
  const risks = useMemo(() => riskCities(cities), [cities]);

  const prevOrdersRef = useRef<number | null>(null);

  useEffect(() => {
    const prev = prevOrdersRef.current;
    prevOrdersRef.current = totalOrders;
    if (prev === null) return;
    if (prev > 0 || totalOrders <= 0) return;

    try {
      const day = todayKey();
      if (typeof window === "undefined") return;
      const logged = usePrefsStore.getState().oracleFirstOrderJiebaoDate;
      if (logged === day) return;
      addLog("捷报：帝国今日首个粮饷已入库", "treasury");
      usePrefsStore.getState().setOracleFirstOrderJiebaoDate(day);
    } catch {
      addLog("捷报：帝国今日首个粮饷已入库", "treasury");
    }
  }, [totalOrders, addLog]);

  const onRiskClick = () => {
    const first = risks[0];
    if (first) onLocateCity(first.id);
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="flex flex-wrap items-center gap-2 text-base font-semibold tracking-tight text-primary sm:text-lg">
          <Sparkles className="h-4 w-4 shrink-0 text-imperial-gold sm:h-5 sm:w-5" />
          帝国简报
          <span className="text-xs font-normal text-muted-foreground sm:text-sm">
            The Oracle
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">
          诸城户部度支与粮饷总额（征战目标） · 战损预警可定位高额户部度支且无粮饷单之城池
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card className="border-imperial-gold/15 bg-background/50 shadow-sm backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Landmark className="h-3.5 w-3.5 text-imperial-vermilion/80" />
              户部度支
            </div>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-imperial-vermilion sm:text-2xl">
              {formatTaels(totalSpend)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">度支总额</p>
          </CardContent>
        </Card>

        <Card className="border-imperial-gold/15 bg-background/50 shadow-sm backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Scale className="h-3.5 w-3.5 text-imperial-gold/80" />
              粮饷总额
            </div>
            <p className="mt-1.5 text-xl font-semibold tabular-nums text-imperial-gold sm:text-2xl">
              {totalOrders.toLocaleString("zh-CN")}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">单量合计</p>
          </CardContent>
        </Card>

        <Card className="border-imperial-gold/15 bg-background/50 shadow-sm backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-primary/80" />
              帝国效能
            </div>
            <p
              className={cn(
                "mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl",
                avgCpa !== null && avgCpa > EFFICIENCY_WARN_THRESHOLD
                  ? "text-imperial-vermilion"
                  : "text-foreground"
              )}
            >
              {avgCpa === null ? "--" : formatTaels(avgCpa)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              户部度支 / 粮饷总额
              {avgCpa !== null && avgCpa > EFFICIENCY_WARN_THRESHOLD
                ? " · 超阈警示"
                : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="relative border-imperial-gold/15 bg-background/50 shadow-sm backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Radio className="h-3.5 w-3.5 text-primary/80" />
                摇钱树
              </div>
              {risks.length > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-imperial-vermilion hover:bg-imperial-vermilion/15"
                  onClick={onRiskClick}
                  title={`战损预警：${risks.length} 座城池度支>${CPA_RISK_THRESHOLD} 且无粮饷单，点击定位`}
                  aria-label="战损预警，定位城池"
                >
                  <Siren className="h-4 w-4 animate-pulse drop-shadow-[0_0_6px_rgba(225,29,72,0.65)]" />
                </Button>
              ) : null}
            </div>
            <p className="mt-1.5 truncate text-lg font-semibold text-foreground sm:text-xl">
              {top ? top.name : "尚无"}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              订单数最高之城
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
