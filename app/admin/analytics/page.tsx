// app/admin/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";

type LifetimeTotals = {
  conversions: number;
  publisherPayoutUsd: number;
  advertiserRevenueUsd: number;
  platformMarginUsd: number;
};

type DailyRow = {
  date: string;
  conversions: number;
  publisherPayoutUsd: number;
  advertiserPayoutUsd: number;
  marginUsd: number;
};

type AnalyticsData = {
  lifetime: LifetimeTotals;
  last30d: { clicks: number; daily: DailyRow[] };
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" /></div>;
  }

  if (error || !data) {
    return <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">{error}</div>;
  }

  const maxMargin = Math.max(...data.last30d.daily.map((d) => d.marginUsd), 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Platform Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">Lifetime revenue and 30-day performance.</p>
      </div>

      {/* Lifetime KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Lifetime conversions", value: data.lifetime.conversions.toLocaleString(), accent: "text-cyan-400" },
          { label: "Advertiser revenue", value: `$${data.lifetime.advertiserRevenueUsd.toFixed(2)}`, accent: "text-sky-400" },
          { label: "Publisher payouts", value: `$${data.lifetime.publisherPayoutUsd.toFixed(2)}`, accent: "text-indigo-400" },
          { label: "Platform margin", value: `$${data.lifetime.platformMarginUsd.toFixed(2)}`, accent: "text-emerald-400" },
        ].map(({ label, value, accent }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-4">
            <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${accent}`}>{label}</p>
            <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* 30-day clicks */}
      <div className="rounded-xl border border-white/10 bg-slate-900/70 px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Last 30 days clicks</p>
        <p className="mt-1 text-2xl font-semibold text-white">{data.last30d.clicks.toLocaleString()}</p>
      </div>

      {/* Daily margin chart */}
      {data.last30d.daily.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Daily platform margin — last 30 days</h2>
          <div className="flex h-28 items-end gap-1">
            {data.last30d.daily.map((d) => (
              <div
                key={d.date}
                className="group relative flex-1 rounded-sm bg-emerald-500/70 hover:bg-emerald-400 transition min-h-[4px]"
                style={{ height: `${Math.max((d.marginUsd / maxMargin) * 100, 4)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-gray-200 shadow-lg z-10">
                  {d.date}: ${d.marginUsd.toFixed(2)} margin · {d.conversions} conv
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-600">
            <span>{data.last30d.daily[0]?.date}</span>
            <span>{data.last30d.daily[data.last30d.daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Daily table */}
      {data.last30d.daily.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
          <div className="border-b border-white/5 bg-slate-900/80 px-5 py-3">
            <h2 className="text-sm font-semibold text-white">Daily breakdown (last 30 days)</h2>
          </div>
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 bg-slate-900/50 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
            <span>Date</span>
            <span className="text-right">Conversions</span>
            <span className="text-right">Advertiser Rev</span>
            <span className="text-right">Publisher Payout</span>
            <span className="text-right">Margin</span>
          </div>
          <div className="divide-y divide-white/5 text-sm max-h-96 overflow-y-auto">
            {[...data.last30d.daily].reverse().map((d) => (
              <div
                key={d.date}
                className="grid grid-cols-1 gap-2 px-5 py-2.5 hover:bg-slate-900/30 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] sm:items-center sm:gap-4"
              >
                <span className="text-slate-300">{d.date}</span>
                <span className="text-right text-gray-300">{d.conversions}</span>
                <span className="text-right text-gray-300">${d.advertiserPayoutUsd.toFixed(2)}</span>
                <span className="text-right text-gray-300">${d.publisherPayoutUsd.toFixed(2)}</span>
                <span className="text-right font-medium text-emerald-300">${d.marginUsd.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
