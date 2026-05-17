"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { GrandTourAtlasPoiBlock } from "@/components/dashboard/grand-tour-atlas-poi-block";
import { GrandTourRegionTree } from "@/components/dashboard/grand-tour-region-tree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useGrandTourStore } from "@/store/grand-tour-store";

const field =
  "border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 h-8 text-sm";

export function GrandTourAtlasPanel() {
  const meals = useGrandTourStore((s) => s.meals);
  const lodges = useGrandTourStore((s) => s.lodges);
  const transports = useGrandTourStore((s) => s.transports);
  const addMeal = useGrandTourStore((s) => s.addMeal);
  const removeMeal = useGrandTourStore((s) => s.removeMeal);
  const addLodge = useGrandTourStore((s) => s.addLodge);
  const removeLodge = useGrandTourStore((s) => s.removeLodge);
  const addTransport = useGrandTourStore((s) => s.addTransport);
  const removeTransport = useGrandTourStore((s) => s.removeTransport);

  const [atlasExpandedRegionId, setAtlasExpandedRegionId] = useState<
    string | null
  >(null);

  const [mealVenue, setMealVenue] = useState("");
  const [mealDish, setMealDish] = useState("");
  const [mealPrice, setMealPrice] = useState("");
  const [lodgeName, setLodgeName] = useState("");
  const [lodgePrice, setLodgePrice] = useState("");
  const [trFrom, setTrFrom] = useState("");
  const [trTo, setTrTo] = useState("");
  const [trVehicle, setTrVehicle] = useState("");
  const [trPrice, setTrPrice] = useState("");

  return (
    <Tabs defaultValue="atlas" className="w-full">
      <TabsList className="mb-4 grid w-full grid-cols-2 bg-slate-900/80">
        <TabsTrigger value="atlas" className="text-xs">
          京畿舆图
        </TabsTrigger>
        <TabsTrigger value="supply" className="text-xs">
          常供名录
        </TabsTrigger>
      </TabsList>

      <TabsContent value="atlas" className="mt-0 space-y-2">
        <p className="text-[11px] leading-relaxed text-slate-500">
          七大区 → 省/直辖市 → 京畿（古代雅称 · 现代名称）；点开京畿可维护胜景
          POI。
        </p>
        <GrandTourRegionTree
          variant="atlas"
          maxHeightClassName="max-h-[min(55vh,520px)]"
          defaultOpenMacroId="huabei"
          atlasExpandedRegionId={atlasExpandedRegionId}
          onAtlasExpandRegion={setAtlasExpandedRegionId}
          renderRegionDetail={(region) => (
            <GrandTourAtlasPoiBlock region={region} />
          )}
        />
      </TabsContent>

      <TabsContent value="supply" className="mt-0">
        <Tabs defaultValue="meal" className="w-full">
          <TabsList className="mb-3 grid w-full grid-cols-3 bg-slate-900/60">
            <TabsTrigger value="meal" className="text-[10px]">
              膳宿
            </TabsTrigger>
            <TabsTrigger value="lodge" className="text-[10px]">
              驻跸
            </TabsTrigger>
            <TabsTrigger value="transport" className="text-[10px]">
              驿传
            </TabsTrigger>
          </TabsList>
          <TabsContent value="meal" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="店名"
                value={mealVenue}
                onChange={(e) => setMealVenue(e.target.value)}
                className={field}
              />
              <Input
                placeholder="内容"
                value={mealDish}
                onChange={(e) => setMealDish(e.target.value)}
                className={field}
              />
              <Input
                placeholder="两"
                value={mealPrice}
                onChange={(e) => setMealPrice(e.target.value)}
                className={cn("w-16", field)}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  addMeal({
                    venue: mealVenue.trim(),
                    dish: mealDish.trim(),
                    defaultPrice:
                      mealPrice.trim() === ""
                        ? undefined
                        : Number.parseFloat(mealPrice),
                  });
                  setMealVenue("");
                  setMealDish("");
                  setMealPrice("");
                }}
              >
                新增
              </Button>
            </div>
            <CatalogList
              items={meals.map((m) => ({
                id: m.id,
                label: `${m.venue} · ${m.dish}${m.defaultPrice != null ? ` · ${m.defaultPrice}两` : ""}`,
              }))}
              onRemove={(id) => {
                const res = removeMeal(id);
                if (!res.ok) window.alert(res.reason);
              }}
            />
          </TabsContent>
          <TabsContent value="lodge" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="客栈名"
                value={lodgeName}
                onChange={(e) => setLodgeName(e.target.value)}
                className={field}
              />
              <Input
                placeholder="两"
                value={lodgePrice}
                onChange={(e) => setLodgePrice(e.target.value)}
                className={cn("w-16", field)}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  addLodge({
                    name: lodgeName.trim(),
                    defaultPrice:
                      lodgePrice.trim() === ""
                        ? undefined
                        : Number.parseFloat(lodgePrice),
                  });
                  setLodgeName("");
                  setLodgePrice("");
                }}
              >
                新增
              </Button>
            </div>
            <CatalogList
              items={lodges.map((m) => ({
                id: m.id,
                label: `${m.name}${m.defaultPrice != null ? ` · ${m.defaultPrice}两` : ""}`,
              }))}
              onRemove={(id) => {
                const res = removeLodge(id);
                if (!res.ok) window.alert(res.reason);
              }}
            />
          </TabsContent>
          <TabsContent value="transport" className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="始"
                value={trFrom}
                onChange={(e) => setTrFrom(e.target.value)}
                className={field}
              />
              <Input
                placeholder="终"
                value={trTo}
                onChange={(e) => setTrTo(e.target.value)}
                className={field}
              />
              <Input
                placeholder="工具"
                value={trVehicle}
                onChange={(e) => setTrVehicle(e.target.value)}
                className={field}
              />
              <Input
                placeholder="两"
                value={trPrice}
                onChange={(e) => setTrPrice(e.target.value)}
                className={cn("w-16", field)}
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  addTransport({
                    from: trFrom.trim(),
                    to: trTo.trim(),
                    vehicle: trVehicle.trim() || "驿传",
                    defaultPrice:
                      trPrice.trim() === ""
                        ? undefined
                        : Number.parseFloat(trPrice),
                  });
                  setTrFrom("");
                  setTrTo("");
                  setTrVehicle("");
                  setTrPrice("");
                }}
              >
                新增
              </Button>
            </div>
            <CatalogList
              items={transports.map((m) => ({
                id: m.id,
                label: `${m.from} → ${m.to} · ${m.vehicle}${m.defaultPrice != null ? ` · ${m.defaultPrice}两` : ""}`,
              }))}
              onRemove={(id) => {
                const res = removeTransport(id);
                if (!res.ok) window.alert(res.reason);
              }}
            />
          </TabsContent>
        </Tabs>
      </TabsContent>
    </Tabs>
  );
}

function CatalogList({
  items,
  onRemove,
}: {
  items: { id: string; label: string }[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-500">尚无条目</p>;
  }
  return (
    <ul className="max-h-48 space-y-1 overflow-y-auto rounded border border-slate-800/80 p-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-2 text-xs text-slate-300"
        >
          <span className="min-w-0 truncate">{item.label}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => onRemove(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
