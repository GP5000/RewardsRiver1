// components/charts/RevenueChart.tsx
"use client";

import { useState } from "react";

type DataPoint = {
  date: string;
  revenueUsd: number;
};

type Props = {
  data7d: DataPoint[];
  data30d: DataPoint[];
  height?: number;
};

export function RevenueChart({ data7d, data30d, height = 120 }: Props) {
  const [range, setRange] = useState<"7d" | "30d">("30d");
  const points = range === "7d" ? data7d : data30d;

  const max = Math.max(...points.map((p) => p.revenueUsd), 1);
  const total = points.reduce((s, p) => s + p.revenueUsd, 0);

  return (
    <div>
      {/* Toggle */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Revenue trend</p>
          <p className="text-lg font-semibold text-white">${total.toFixed(2)}</p>
        </div>
        <div className="flex rounded-full border border-white/10 overflow-hidden">
          {(["7d", "30d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs font-medium transition ${
                range === r
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "bg-slate-900/60 text-gray-400 hover:text-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {points.length === 0 ? (
        <div className="flex items-center justify-center text-xs text-gray-500" style={{ height }}>
          No data yet
        </div>
      ) : (
        <div className="relative" style={{ height }}>
          {/* Bar chart */}
          <div className="flex h-full items-end gap-0.5">
            {points.map((p) => (
              <div
                key={p.date}
                className="group relative flex-1 rounded-sm bg-cyan-500/60 hover:bg-cyan-400 transition"
                style={{ height: `${Math.max((p.revenueUsd / max) * 100, 2)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-gray-200 shadow-lg z-10">
                  {p.date}: ${p.revenueUsd.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {points.length > 0 && (
        <div className="mt-1.5 flex justify-between text-[10px] text-gray-600">
          <span>{points[0]?.date}</span>
          <span>{points[points.length - 1]?.date}</span>
        </div>
      )}
    </div>
  );
}
