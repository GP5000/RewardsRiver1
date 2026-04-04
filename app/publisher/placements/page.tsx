// app/publisher/placements/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useMemo, useState } from "react";
import { Copy, LayoutGrid, Activity } from "lucide-react";

type PlacementItem = {
  id: string;
  name: string;
  appName: string | null;
  platform: string;
  url: string | null;
  primaryGeo: string;
  notes?: string | null;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type PlacementStatsItem = {
  id: string;
  name: string;
  clicks: number;
  conversions: number;
  impressions: number;
  revenueUsd: number;
  epc: number;
  ecpm: number;
  cr: number;
};

type PlacementStatsResponse = {
  ok: boolean;
  windowDays: number;
  totals: {
    clicks: number;
    conversions: number;
    impressions: number;
    revenueUsd: number;
    epc: number;
    ecpm: number;
    cr: number;
  };
  placements: PlacementStatsItem[];
};

type PlacementListResponse = {
  ok: boolean;
  count: number;
  items: PlacementItem[];
};

const formatCurrency = (value: number) =>
  `$${value.toFixed(2)}`;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
};

const PlacementsPage: React.FC = () => {
  const [placements, setPlacements] = useState<PlacementItem[]>([]);
  const [stats, setStats] = useState<PlacementStatsResponse | null>(null);
  const [statsWindow, setStatsWindow] = useState<7 | 30 | 90>(7);
  const [loading, setLoading] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load placements once
  useEffect(() => {
    let cancelled = false;

    const loadPlacements = async () => {
      try {
        const res = await fetch("/api/publisher/placements", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to load placements");
        const data: PlacementListResponse = await res.json();
        if (!data.ok) throw new Error("Failed to load placements");
        if (!cancelled) setPlacements(data.items || []);
      } catch (err: any) {
        console.error("PLACEMENTS PAGE: placements error", err);
        if (!cancelled) setError("Unable to load placements.");
      }
    };

    loadPlacements();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load stats whenever statsWindow changes
  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/publisher/placements/stats?days=${statsWindow}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error("Failed to load placement stats");
        const data: PlacementStatsResponse = await res.json();
        if (!data.ok) throw new Error("Failed to load placement stats");

        if (!cancelled) setStats(data);
      } catch (err: any) {
        console.error("PLACEMENTS PAGE: stats error", err);
        if (!cancelled)
          setError(
            "Unable to load placement statistics right now. Please try again shortly."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [statsWindow]);

  // Merge stats into placement rows (for future per-row stats)
  const mergedPlacements = useMemo(() => {
    const statsById =
      stats?.placements?.reduce<Record<string, PlacementStatsItem>>(
        (acc, s) => {
          acc[s.id] = s;
          return acc;
        },
        {}
      ) ?? {};

    return placements.map((p) => ({
      ...p,
      stats: statsById[p.id] ?? null,
    }));
  }, [placements, stats]);

  // Copy wall URL
  const handleCopyWallUrl = async (placementId: string) => {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const wallUrl = `${origin}/wall?placement_id=${placementId}`;

      await navigator.clipboard.writeText(wallUrl);
      setCopyToast("Wall URL copied to clipboard");
      setTimeout(() => setCopyToast(null), 2200);
    } catch (err) {
      console.error("COPY WALL URL ERROR:", err);
      setCopyToast("Unable to copy URL. Please copy manually.");
      setTimeout(() => setCopyToast(null), 2500);
    }
  };

  const totals = stats?.totals;

  return (
    <>
      {/* Copy toast */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-[1100] rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-100 shadow-lg backdrop-blur">
          {copyToast}
        </div>
      )}

      <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            <LayoutGrid className="h-6 w-6 text-cyan-400" />
            Placements
          </h1>
          <p className="max-w-2xl text-sm text-gray-400">
            Manage where your RewardsRiver offerwall appears across your sites
            and apps. Track performance per placement and copy wall URLs for
            quick integration.
          </p>
        </div>

        {/* Stats bar */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 shadow-lg backdrop-blur">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span className="font-medium text-gray-300">
                Stats window:
              </span>
              <div className="inline-flex rounded-full border border-white/10 bg-slate-900/70 p-0.5 text-[11px]">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setStatsWindow(d as 7 | 30 | 90)}
                    className={`rounded-full px-3 py-1 transition ${
                      statsWindow === d
                        ? "bg-cyan-500 text-slate-900"
                        : "text-gray-400 hover:bg-slate-800 hover:text-gray-100"
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {loading && (
              <span className="text-[11px] text-cyan-300">
                Refreshing stats…
              </span>
            )}
          </div>

          <div className="grid gap-4 text-xs sm:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                Clicks
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                {totals?.clicks ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                Outbound clicks for all placements.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                Conversions
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                {totals?.conversions ?? 0}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                Completed conversions attributed to this window.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                Revenue
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                {formatCurrency(totals?.revenueUsd ?? 0)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                Payouts from all offers in this window.
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                EPC &amp; Impressions
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                ${(totals?.epc ?? 0).toFixed(3)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                EPC over{" "}
                <span className="font-medium text-gray-300">
                  {totals?.impressions ?? 0} impressions
                </span>
                .
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-gray-400">
                eCPM &amp; CR
              </div>
              <div className="mt-1 text-xl font-semibold text-white">
                ${(totals?.ecpm ?? 0).toFixed(2)}
              </div>
              <div className="mt-0.5 text-[11px] text-gray-500">
                Effective CPM ·{" "}
                <span className="font-medium text-gray-300">
                  {(totals?.cr ?? 0).toFixed(1)}% CR
                </span>
                .
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-3 text-[11px] text-red-400">
              {error}
            </p>
          )}
        </div>

        {/* Placements table */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 shadow-lg backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">
                Your placements
              </h2>
              <p className="mt-1 text-xs text-gray-400">
                Each placement has its own wall URL. Embed these URLs in your
                sites or apps to start generating impressions and revenue.
              </p>
            </div>
          </div>

          {mergedPlacements.length === 0 ? (
            <div className="py-10 text-center text-xs text-gray-500">
              You don&apos;t have any placements yet. Create a placement from the{" "}
              <span className="font-medium text-gray-300">Add Placement</span>{" "}
              menu to generate your first wall URL.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-gray-300">
                <thead className="border-b border-white/10 bg-slate-900/80 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  <tr>
                    <th className="px-3 py-2">Placement</th>
                    <th className="px-3 py-2">App / Site</th>
                    <th className="px-3 py-2">GEO</th>
                    <th className="px-3 py-2">Created</th>
                    <th className="px-3 py-2 text-right">Wall URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mergedPlacements.map((p) => {
                    const wallUrl =
                      typeof window !== "undefined"
                        ? `${window.location.origin}/wall?placement_id=${p.id}`
                        : `/wall?placement_id=${p.id}`;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-900/70 transition"
                      >
                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-100">
                              {p.name}
                            </span>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                              <span className="rounded-full bg-slate-800 px-2 py-0.5">
                                {p.platform.toUpperCase()}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 ${
                                  p.active
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : "bg-gray-600/10 text-gray-300"
                                }`}
                              >
                                {p.active ? "Active" : "Paused"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 align-middle">
                          <div className="flex flex-col">
                            <span className="text-gray-100">
                              {p.appName || "—"}
                            </span>
                            {p.url && (
                              <span className="truncate text-[10px] text-gray-500">
                                {p.url}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3 align-middle text-gray-200">
                          {p.primaryGeo || "GLOBAL"}
                        </td>

                        <td className="px-3 py-3 align-middle text-gray-200">
                          {formatDate(p.createdAt)}
                        </td>

                        <td className="px-3 py-3 align-middle text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyWallUrl(p.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-slate-900/80 px-3 py-1.5 text-[11px] font-medium text-gray-100 hover:border-cyan-400/60 hover:bg-slate-900"
                          >
                            <Copy className="h-3 w-3" />
                            Copy wall URL
                          </button>
                          <div className="mt-1 text-[10px] text-gray-500">
                            placement_id={p.id.slice(-8)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PlacementsPage;
