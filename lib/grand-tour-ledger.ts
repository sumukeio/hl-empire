import type { TourItemKind, TourLeg } from "@/store/types";

export type TourLedgerRow = {
  kind: TourItemKind;
  label: string;
  count: number;
  subtotal: number;
};

export type TourLedgerSummary = {
  rows: TourLedgerRow[];
  total: number;
  byDay: { dayIndex: number; subtotal: number }[];
};

const KIND_ORDER: TourItemKind[] = [
  "sight",
  "ticket",
  "meal",
  "lodge",
  "transport",
];

export function computeTourLedger(legs: TourLeg[]): TourLedgerSummary {
  const byKind = new Map<TourItemKind, { count: number; subtotal: number }>();
  const byDay = new Map<number, number>();
  let total = 0;

  for (const leg of legs) {
    const price =
      typeof leg.price === "number" && Number.isFinite(leg.price)
        ? Math.max(0, leg.price)
        : 0;
    total += price;
    byDay.set(leg.dayIndex, (byDay.get(leg.dayIndex) ?? 0) + price);
    const bucket = byKind.get(leg.kind) ?? { count: 0, subtotal: 0 };
    bucket.count += 1;
    bucket.subtotal += price;
    byKind.set(leg.kind, bucket);
  }

  const kindLabel: Record<TourItemKind, string> = {
    sight: "游览",
    ticket: "门券",
    meal: "膳宿",
    lodge: "驻跸",
    transport: "驿传",
  };

  const rows: TourLedgerRow[] = KIND_ORDER.filter((k) => byKind.has(k)).map(
    (kind) => {
      const b = byKind.get(kind)!;
      return {
        kind,
        label: kindLabel[kind],
        count: b.count,
        subtotal: b.subtotal,
      };
    }
  );

  return {
    rows,
    total,
    byDay: Array.from(byDay.entries())
      .map(([dayIndex, subtotal]) => ({ dayIndex, subtotal }))
      .sort((a, b) => a.dayIndex - b.dayIndex),
  };
}

export { formatTaels } from "@/lib/format-taels";
