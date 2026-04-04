// app/publisher/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  Link2,
  Wallet,
  ArrowRight,
  Sparkles,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

type OverviewDailyRevenue = {
  date: string; // ISO
  revenueUsd: number;
};

type OverviewLifetime = {
  clicks: number;
  conversions: number;
  revenueUsd: number;
  epc: number;
  cr: number;
  impressions: number;
  ecpm: number;
};

type OverviewWallet = {
  balanceUsd: number;
  pendingUsd: number;
  totalPaidUsd: number;
};

type TopOffer = {
  id: string;
  name: string;
  revenueUsd: number;
  clicks: number;
  leads: number;
  epcUsd: number;
};

type OverviewResponse = {
  ok: boolean;
  publisher: {
    id: string;
    name: string | null;
  };
  lifetime: OverviewLifetime;
  last7d: OverviewLifetime;
  wallet: OverviewWallet;
  placements: {
    count: number;
  };
  // ⬇ NEW, optional so it won't break if API fails / old
  dailyRevenue?: OverviewDailyRevenue[];
  topOffers?: TopOffer[];
};
type PlacementSummary = {
  id: string;
  name: string;
};

/* ─────────────────────────────────────────────────────────────
   Loading overlay + toast (local)
   ───────────────────────────────────────────────────────────── */

function LocalLoadingOverlay({
  show,
  logoSrc = "/logo2.jpeg",
}: {
  show: boolean;
  logoSrc?: string;
}) {
  return (
    <div
      aria-hidden={!show}
      aria-busy={show}
      role="status"
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      <motion.img
        src={logoSrc}
        alt="RewardsRiver"
        className="h-20 w-20"
        initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </div>
  );
}

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;

  const Icon = toast.type === "success" ? Sparkles : BarChart3;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[1100] max-w-sm rounded-xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/95 to-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-200">
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex-1 text-sm text-gray-100">{toast.message}</div>
          <button
            onClick={onClose}
            className="ml-2 text-xs text-gray-400 hover:text-gray-200"
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────
   Lightweight sparkline using SVG
   ───────────────────────────────────────────────────────────── */

function RevenueSparkline({ points }: { points: OverviewDailyRevenue[] }) {
  const pathD = useMemo(() => {
    if (!points.length) return "";

    const revenues = points.map((p) => p.revenueUsd);
    const max = Math.max(...revenues, 1);
    const min = 0;

    const width = 100;
    const height = 28;
    const stepX = width / Math.max(points.length - 1, 1);

    const scaleY = (value: number) => {
      if (max === min) return height / 2;
      const t = (value - min) / (max - min);
      return height - t * height;
    };

    return points
      .map((p, index) => {
        const x = index * stepX;
        const y = scaleY(p.revenueUsd);
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  if (!points.length) {
    return (
      <div className="flex h-[28px] items-center text-[10px] text-gray-500">
        No data yet
      </div>
    );
  }

  return (
    <svg viewBox="0 0 100 28" className="h-[28px] w-full">
      <defs>
        <linearGradient id="sparkline" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke="url(#sparkline)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page Component
   ───────────────────────────────────────────────────────────── */

const PublisherDashboardPage: React.FC = () => {
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const [placements, setPlacements] = useState<PlacementSummary[]>([]);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);

  // We don't yet have per-day breakdown or top offers in the API
  // These stay empty until you wire that up server-side.
  const dailyRevenue: OverviewDailyRevenue[] = [];
  const topOffers: any[] = [];

    useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

     const placementsRes = await fetch("/api/publisher/placements", {
  cache: "no-store",
});
if (placementsRes.ok) {
  const pdata = await placementsRes.json();

  const mapped: PlacementSummary[] = (pdata.items || []).map((p: any) => ({
    id: p.id || p._id,                               // support both shapes
    name: p.name || p.appName || "Unnamed placement"
  }));

  setPlacements(mapped);
}


        // 2) load overview (optionally filtered by placement)
        const qs = selectedPlacementId
          ? `?placementId=${encodeURIComponent(selectedPlacementId)}`
          : "";
        const res = await fetch(`/api/publisher/overview${qs}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("Failed to load dashboard data.");
        }
        const data: OverviewResponse = await res.json();
        if (!data.ok) throw new Error("Failed to load dashboard data.");
        setOverview(data);
      } catch (err) {
        console.error(err);
        setToast({
          type: "error",
          message:
            "Unable to load your publisher stats right now. You can refresh or try again shortly.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedPlacementId]);


  const lifetime = overview?.lifetime;
  const last7d = overview?.last7d;
  const wallet = overview?.wallet;

  return (
    <>
      <LocalLoadingOverlay show={loading} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
            Publisher dashboard
          </h1>
          <p className="max-w-2xl text-sm text-gray-400">
            Monitor your RewardsRiver performance at a glance. Track earnings,
            traffic quality, and top-performing placements in one place.
          </p>
        </div>
        {/* Placement selector */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedPlacementId(null)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              !selectedPlacementId
                ? "border-cyan-400/80 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-slate-900/70 text-gray-300 hover:border-cyan-400/60"
            }`}
          >
            All placements
          </button>

          {placements.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlacementId(p.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selectedPlacementId === p.id
                  ? "border-cyan-400/80 bg-cyan-400/10 text-cyan-100"
                  : "border-white/10 bg-slate-900/70 text-gray-300 hover:border-cyan-400/60"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Top row: overview + quick actions */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* Earnings overview card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#020617] via-[#020617] to-[#030712] px-5 py-5 shadow-[0_0_40px_rgba(56,189,248,0.25)]/10"
          >
            <div className="pointer-events-none absolute -left-28 -top-16 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 bottom-[-40%] h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/80 to-sky-500/90 shadow-lg shadow-cyan-500/50">
                  <Wallet className="h-6 w-6 text-slate-950" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/70">
                    Earnings summary
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    $
                    {(last7d?.revenueUsd ?? 0).toFixed(2)}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      last 7 days
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400">
                    Lifetime revenue:{" "}
                    <span className="font-medium text-gray-200">
                      ${(lifetime?.revenueUsd ?? 0).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid w-full gap-3 text-xs text-gray-300 sm:grid-cols-2 md:w-auto">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                      Lifetime stats
                    </span>
                    <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {lifetime?.clicks ?? 0} clicks
                  </p>
                 <p className="mt-0.5 text-[11px] text-gray-500">
  {lifetime?.conversions ?? 0} conversions ·{" "}
  {lifetime?.impressions ?? 0} impressions · EPC{" "}
  <span className="font-medium text-gray-300">
    ${(lifetime?.epc ?? 0).toFixed(3)}
  </span>{" "}
  · eCPM{" "}
  <span className="font-medium text-gray-300">
    ${(lifetime?.ecpm ?? 0).toFixed(2)}
  </span>{" "}
  · CR{" "}
  <span className="font-medium text-gray-300">
    {(lifetime?.cr ?? 0).toFixed(1)}%
  </span>
</p>

                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                      Wallet
                    </span>
                    <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <p className="mt-1 text-lg font-semibold text-white">
                    ${(wallet?.balanceUsd ?? 0).toFixed(2)}{" "}
                    <span className="text-xs text-gray-400">available</span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Pending:{" "}
                    <span className="font-medium text-gray-300">
                      ${(wallet?.pendingUsd ?? 0).toFixed(2)}
                    </span>{" "}
                    · Paid out:{" "}
                    <span className="font-medium text-gray-300">
                      ${(wallet?.totalPaidUsd ?? 0).toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.06 }}
            className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 shadow-lg backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Quick actions
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Jump straight into the most important parts of your publisher
                  account.
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Link
                href="/publisher/payouts"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 px-4 py-3 transition hover:border-cyan-400/60 hover:bg-slate-900/90"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-300">
                    View payouts
                  </span>
                  <span className="mt-0.5 text-[11px] text-gray-500">
                    Check your payout history and request withdrawals.
                  </span>
                </div>
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-400/10 text-cyan-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>

              <Link
                href="/publisher/offers"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-950/80 px-4 py-3 transition hover:border-emerald-400/60 hover:bg-slate-900/90"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-300">
                    Explore offers
                  </span>
                  <span className="mt-0.5 text-[11px] text-gray-500">
                    Find high-converting offers tailored to your audience.
                  </span>
                </div>
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-400/10 text-emerald-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_rgba(52,211,153,0.4)] transition">
                  <TrendingUp className="h-3.5 w-3.5" />
                </span>
              </Link>

              <Link
                href="/publisher/postback-tester"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 transition hover:border-indigo-400/60 hover:bg-slate-900"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-300">
                    Test postbacks
                  </span>
                  <span className="mt-0.5 text-[11px] text-gray-500">
                    Validate your tracking setup in a safe sandbox.
                  </span>
                </div>
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-indigo-400/50 bg-indigo-400/10 text-indigo-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_rgba(129,140,248,0.4)] transition">
                  <MousePointerClick className="h-3.5 w-3.5" />
                </span>
              </Link>

              <Link
                href="/publisher/docs"
                className="group flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 transition hover:border-gray-400/60 hover:bg-slate-900"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-gray-300">
                    Integration docs
                  </span>
                  <span className="mt-0.5 text-[11px] text-gray-500">
                    Get started with links, widgets, and advanced integrations.
                  </span>
                </div>
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full border border-gray-500/50 bg-gray-500/10 text-gray-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-[0_0_20px_rgba(148,163,184,0.4)] transition">
                  <Link2 className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Middle row: traffic quality + performance snapshot */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)]">
          {/* Traffic quality card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.08 }}
            className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 shadow-lg backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Traffic quality (last 7 days)
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  See how your clicks, conversions, EPC, and conversion rate are
                  performing recently.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4 text-xs">
              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  Clicks
                </div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {last7d?.clicks ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  Total outbound clicks.
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  Conversions
                </div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {last7d?.conversions ?? 0}
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  Completed conversions.
                </div>
              </div>

             <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
  <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
    EPC
  </div>
  <div className="mt-1 text-xl font-semibold text-white">
    ${(last7d?.epc ?? 0).toFixed(3)}
  </div>
  <div className="mt-0.5 text-[11px] text-gray-500">
    Earnings per click (7d).{" "}
    <span className="font-medium text-gray-300">
      {last7d?.impressions ?? 0} impressions
    </span>{" "}
    · eCPM{" "}
    <span className="font-medium text-gray-300">
      ${(last7d?.ecpm ?? 0).toFixed(2)}
    </span>
  </div>
</div>


              <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  Conversion rate
                </div>
                <div className="mt-1 text-xl font-semibold text-white">
                  {(last7d?.cr ?? 0).toFixed(1)}%
                </div>
                <div className="mt-0.5 text-[11px] text-gray-500">
                  Conversions / clicks · 100.
                </div>
              </div>
            </div>
          </motion.div>

          {/* Performance snapshot / explainer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 shadow-lg backdrop-blur"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Performance snapshot
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  A quick guide to what matters most for maximizing your
                  RewardsRiver earnings.
                </p>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-gray-300">
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                <div>
                  <span className="font-semibold text-gray-100">
                    Traffic quality beats raw volume.
                  </span>{" "}
                  Highly engaged users with good intent convert better than
                  cheap, untargeted clicks.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <div>
                  <span className="font-semibold text-gray-100">
                    Watch your EPC and CR.
                  </span>{" "}
                  If EPC drops, test different placements, pre-sell content, or
                  lean into offers with stronger engagement.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <div>
                  <span className="font-semibold text-gray-100">
                    Diversify offer types.
                  </span>{" "}
                  Mix surveys, app installs, and high-value CPA offers to smooth
                  out volatility and seasonal shifts.
                </div>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                <div>
                  <span className="font-semibold text-gray-100">
                    Keep your postbacks clean.
                  </span>{" "}
                  Accurately tracked conversions are the foundation of reliable
                  optimization and higher caps.
                </div>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom: top offers table / trends placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 shadow-lg backdrop-blur"
        >
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Revenue trend & top offers
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Start sending traffic to see daily revenue trends and your
                highest-earning offers.
              </p>
            </div>
            <Link
              href="/publisher/offers"
              className="hidden items-center gap-1 rounded-full border border-white/15 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-gray-200 transition hover:border-cyan-400/60 hover:bg-slate-900 sm:inline-flex"
            >
              View all offers
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Trend sparkline */}
          <div className="mb-4 rounded-xl border border-white/5 bg-slate-950/70 px-4 py-3">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-gray-400">
              <span>Revenue trend</span>
            </div>
            <div className="mt-2">
              <RevenueSparkline points={dailyRevenue} />
            </div>
          </div>

          {/* Top offers table */}
          <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950/70">
            <div className="grid grid-cols-[2.4fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 border-b border-white/5 bg-slate-900/80 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
              <span>Offer</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Clicks</span>
              <span className="text-right">Conversions</span>
              <span className="text-right">EPC</span>
            </div>

            {topOffers.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-gray-500">
                No offer performance data yet. Once your traffic generates
                conversions, your top offers will appear here.
              </div>
            ) : (
              <div className="divide-y divide-white/5 text-xs">
                {topOffers.map((offer: any) => (
                  <div
                    key={offer.id}
                    className="grid grid-cols-[2.4fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 px-4 py-3 hover:bg-slate-900/70"
                  >
                    <div className="flex flex-col">
                      <span className="truncate text-gray-100">
                        {offer.name}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Offer ID: {offer.id}
                      </span>
                    </div>
                    <div className="flex items-center justify-end">
                      <span className="font-semibold text-gray-100">
                        ${offer.revenueUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end text-gray-200">
                      {offer.clicks}
                    </div>
                    <div className="flex items-center justify-end text-gray-200">
                      {offer.leads}
                    </div>
                    <div className="flex items-center justify-end text-gray-100">
                      ${offer.epcUsd.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default PublisherDashboardPage;
