"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Wallet, Megaphone, ArrowRight, Plus } from "lucide-react";

type DashboardData = {
  wallet: { balanceCents: number; balanceUsd: number };
  lifetime: { conversions: number; spendUsd: number };
  last7d: { conversions: number; spendUsd: number };
  budget: { totalUsd: number; spentUsd: number; remainingUsd: number; percentUsed: number };
  dailySpend: { date: string; spendUsd: number; conversions: number }[];
  campaigns: { total: number; active: number; pending: number; paused: number };
};

function StatCard({
  label,
  value,
  sub,
  accent = "sky",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  const colors: Record<string, string> = {
    sky: "text-sky-400",
    cyan: "text-cyan-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
  };
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-4">
      <p className={`text-[11px] font-medium uppercase tracking-[0.18em] ${colors[accent] ?? colors.sky}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

export default function AdvertiserDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/advertiser/dashboard", { cache: "no-store" })
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
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">
        {error || "Failed to load dashboard."}
      </div>
    );
  }

  const maxSpend = Math.max(...data.dailySpend.map((d) => d.spendUsd), 1);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="bg-gradient-to-r from-sky-300 via-cyan-400 to-indigo-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
            Advertiser dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">Monitor spend, conversions, and campaign health.</p>
        </div>
        <Link
          href="/advertiser/campaigns/new"
          className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Wallet balance"
          value={`$${data.wallet.balanceUsd.toFixed(2)}`}
          sub="Available to spend"
          accent="sky"
        />
        <StatCard
          label="Lifetime spend"
          value={`$${data.lifetime.spendUsd.toFixed(2)}`}
          sub={`${data.lifetime.conversions} conversions total`}
          accent="cyan"
        />
        <StatCard
          label="Last 7 days"
          value={`$${data.last7d.spendUsd.toFixed(2)}`}
          sub={`${data.last7d.conversions} conversions`}
          accent="emerald"
        />
        <StatCard
          label="Budget used"
          value={`${data.budget.percentUsed}%`}
          sub={`$${data.budget.spentUsd.toFixed(2)} of $${data.budget.totalUsd.toFixed(2)}`}
          accent="amber"
        />
      </div>

      {/* Budget progress bar */}
      {data.budget.totalUsd > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/70 px-5 py-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
            <span>Total budget consumed</span>
            <span>${data.budget.remainingUsd.toFixed(2)} remaining</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all"
              style={{ width: `${Math.min(data.budget.percentUsed, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Campaigns summary + quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campaign counts */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Campaigns</h2>
            <Link
              href="/advertiser/campaigns"
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total", value: data.campaigns.total, color: "text-white" },
              { label: "Active", value: data.campaigns.active, color: "text-emerald-400" },
              { label: "Pending review", value: data.campaigns.pending, color: "text-amber-400" },
              { label: "Paused", value: data.campaigns.paused, color: "text-slate-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
                <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Quick actions</h2>
          <div className="space-y-3">
            {[
              {
                href: "/advertiser/campaigns/new",
                label: "Launch a new campaign",
                sub: "Set up targeting, budget, and creative",
                icon: Megaphone,
                color: "sky",
              },
              {
                href: "/advertiser/analytics",
                label: "View analytics",
                sub: "Geo, device, and campaign breakdowns",
                icon: BarChart3,
                color: "cyan",
              },
              {
                href: "/advertiser/billing",
                label: "Add funds",
                sub: "Top up your wallet to keep campaigns running",
                icon: Wallet,
                color: "emerald",
              },
            ].map(({ href, label, sub, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 transition hover:border-sky-400/60"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-400/30 bg-sky-400/10 text-sky-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-200">{label}</p>
                    <p className="text-[11px] text-gray-500">{sub}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-500 group-hover:text-sky-300 transition" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Daily spend chart (last 30d) */}
      {data.dailySpend.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Daily spend — last 30 days</h2>
            <Link
              href="/advertiser/analytics"
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              Full analytics <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex h-32 items-end gap-1">
            {data.dailySpend.map((d) => (
              <div
                key={d.date}
                className="group relative flex-1 rounded-sm bg-sky-500/70 hover:bg-sky-400 transition"
                style={{ height: `${Math.max((d.spendUsd / maxSpend) * 100, 4)}%` }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-gray-200 shadow-lg z-10">
                  {d.date}: ${d.spendUsd.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-gray-600">
            <span>{data.dailySpend[0]?.date}</span>
            <span>{data.dailySpend[data.dailySpend.length - 1]?.date}</span>
          </div>
        </div>
      )}
    </div>
  );
}
