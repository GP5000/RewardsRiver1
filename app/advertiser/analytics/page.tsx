"use client";

import { useEffect, useState } from "react";

type AnalyticsRow = {
  campaignId: string;
  campaignName: string;
  clicks: number;
  conversions: number;
  spendUsd: number;
  cvr: number;
  epc: number;
};

type DailyRow = {
  date: string;
  spendUsd: number;
  conversions: number;
};

type AnalyticsData = {
  byCampaign: AnalyticsRow[];
  daily: DailyRow[];
};

export default function AdvertiserAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/advertiser/analytics", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error || "Failed to load");
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">
        {error || "Failed to load analytics."}
      </div>
    );
  }

  const maxSpend = Math.max(...data.daily.map((d) => d.spendUsd), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-gray-400">Campaign performance breakdown.</p>
      </div>

      {/* Daily spend chart */}
      {data.daily.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Daily spend — last 30 days</h2>
          <div className="flex h-28 items-end gap-1">
            {data.daily.map((d) => (
              <div
                key={d.date}
                className="group relative flex-1 rounded-sm bg-sky-500/70 hover:bg-sky-400 transition min-h-[4px]"
                style={{ height: `${Math.max((d.spendUsd / maxSpend) * 100, 4)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-gray-200 shadow-lg z-10">
                  {d.date}: ${d.spendUsd.toFixed(2)} · {d.conversions} conv
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-600">
            <span>{data.daily[0]?.date}</span>
            <span>{data.daily[data.daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* By campaign */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
        <div className="border-b border-white/5 bg-slate-900/80 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">By campaign</h2>
        </div>
        <div className="hidden grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 bg-slate-900/50 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
          <span>Campaign</span>
          <span className="text-right">Clicks</span>
          <span className="text-right">Conversions</span>
          <span className="text-right">Spend</span>
          <span className="text-right">CVR</span>
          <span className="text-right">EPC</span>
        </div>
        {data.byCampaign.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-gray-500">No data yet.</p>
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            {data.byCampaign.map((row) => (
              <div
                key={row.campaignId}
                className="grid grid-cols-1 gap-2 px-5 py-3 hover:bg-slate-900/30 sm:grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1fr] sm:items-center sm:gap-4"
              >
                <span className="font-medium text-gray-100">{row.campaignName}</span>
                <span className="text-right text-gray-300">{row.clicks}</span>
                <span className="text-right text-gray-300">{row.conversions}</span>
                <span className="text-right text-gray-300">${row.spendUsd.toFixed(2)}</span>
                <span className="text-right text-gray-300">{(row.cvr * 100).toFixed(1)}%</span>
                <span className="text-right text-gray-300">${row.epc.toFixed(3)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
