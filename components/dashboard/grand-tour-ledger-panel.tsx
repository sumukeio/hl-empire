"use client";

import { computeTourLedger, formatTaels } from "@/lib/grand-tour-ledger";
import type { GrandTour } from "@/store/types";

export function GrandTourLedgerPanel({ tour }: { tour: GrandTour }) {
  const ledger = computeTourLedger(tour.legs);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-slate-800/90">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">类目</th>
              <th className="px-3 py-2 text-right">条数</th>
              <th className="px-3 py-2 text-right">小计（两）</th>
            </tr>
          </thead>
          <tbody>
            {ledger.rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                  尚无程目，无法呈报用度
                </td>
              </tr>
            ) : (
              ledger.rows.map((row) => (
                <tr key={row.kind} className="border-b border-slate-800/50">
                  <td className="px-3 py-2 text-slate-200">{row.label}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-400">
                    {row.count}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-imperial-gold/90">
                    {formatTaels(row.subtotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-imperial-gold/10">
              <td colSpan={2} className="px-3 py-3 text-sm font-medium text-imperial-gold">
                共计
              </td>
              <td className="px-3 py-3 text-right text-lg font-semibold tabular-nums text-imperial-gold">
                {formatTaels(ledger.total)} 两
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {ledger.byDay.length > 0 && (
        <div className="rounded-lg border border-slate-800/90 p-3">
          <h4 className="mb-2 text-xs font-medium text-slate-400">按日</h4>
          <ul className="space-y-1 text-sm">
            {ledger.byDay.map((d) => (
              <li
                key={d.dayIndex}
                className="flex justify-between tabular-nums text-slate-300"
              >
                <span>第 {d.dayIndex} 日</span>
                <span className="text-imperial-gold/90">
                  {formatTaels(d.subtotal)} 两
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
