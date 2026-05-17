"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGrandTourStore } from "@/store/grand-tour-store";
import type { TourRegion } from "@/store/types";

const field =
  "border-slate-700/90 bg-slate-900/85 text-slate-100 placeholder:text-slate-500 focus-visible:border-imperial-gold/45 h-8 text-sm";

export function GrandTourAtlasPoiBlock({ region }: { region: TourRegion }) {
  const addPoi = useGrandTourStore((s) => s.addPoi);
  const removePoi = useGrandTourStore((s) => s.removePoi);
  const liveRegion = useGrandTourStore((s) =>
    s.regions.find((r) => r.id === region.id)
  );
  const r = liveRegion ?? region;

  const [newPoiName, setNewPoiName] = useState("");
  const [newPoiTicket, setNewPoiTicket] = useState("");

  return (
    <div className="mb-2 mt-1 space-y-2 rounded border border-slate-800/80 bg-slate-950/60 p-2">
      {r.pois.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <span className="text-slate-300">
            {p.name}
            {p.defaultTicketPrice != null
              ? ` · 门券 ${p.defaultTicketPrice} 两`
              : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-imperial-vermilion"
            onClick={() => {
              const res = removePoi(r.id, p.id);
              if (!res.ok) window.alert(res.reason);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="胜景名"
          value={newPoiName}
          onChange={(e) => setNewPoiName(e.target.value)}
          className={cn("min-w-[6rem] flex-1", field)}
        />
        <Input
          placeholder="门券两"
          value={newPoiTicket}
          onChange={(e) => setNewPoiTicket(e.target.value)}
          className={cn("w-20", field)}
        />
        <Button
          type="button"
          size="sm"
          className="bg-imperial-gold/90 text-slate-950"
          onClick={() => {
            const price =
              newPoiTicket.trim() === ""
                ? undefined
                : Number.parseFloat(newPoiTicket);
            addPoi(
              r.id,
              newPoiName,
              price != null && Number.isFinite(price) ? price : undefined
            );
            setNewPoiName("");
            setNewPoiTicket("");
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
