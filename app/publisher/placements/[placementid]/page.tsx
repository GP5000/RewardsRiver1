"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  useRouter,
  useSearchParams,
  usePathname,
} from "next/navigation";
import { ArrowLeft, Copy, Link2, Activity, Globe2 } from "lucide-react";
import Link from "next/link";

const WALL_BASE_URL =
  process.env.NEXT_PUBLIC_WALL_BASE_URL || "https://your-domain.com/wall";

type PlacementDetail = {
  id: string;
  publisherId: string;
  name: string;
  appName: string | null;
  platform: string;
  url: string | null;
  primaryGeo: string | null;
  notes: string | null;
  marginPercent: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type PlacementStats = {
  placementId: string;
  windowDays: number;
  clicks: number;
  conversions: number;
  revenueUsd: number;
  epc: number;
  cr: number;
};

type DayOption = 7 | 30 | 90;

function PlacementDetailPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // 🔑 Derive placementId from the path: /publisher/placements/<id>
  const placementId = useMemo(() => {
    if (!pathname) return "";
    const parts = pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  }, [pathname]);

  const publisherIdFromQuery = searchParams.get("publisherId") || "";

  const [placement, setPlacement] = useState<PlacementDetail | null>(null);
  const [placementLoading, setPlacementLoading] = useState(true);
  const [placementError, setPlacementError] = useState<string | null>(null);

  const [stats, setStats] = useState<PlacementStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [days, setDays] = useState<DayOption>(7);

  const [copyLabel, setCopyLabel] = useState<"Copy" | "Copied!">("Copy");

  const [marginInput, setMarginInput] = useState<string>("");
  const [marginSaving, setMarginSaving] = useState(false);
  const [marginError, setMarginError] = useState<string | null>(null);
  const [marginSuccess, setMarginSuccess] = useState(false);

  // Sync marginInput when placement loads
  useEffect(() => {
    if (placement) setMarginInput(String(placement.marginPercent ?? 0));
  }, [placement?.id]);

  async function saveMargin() {
    if (!placementId) return;
    const val = parseFloat(marginInput);
    if (isNaN(val) || val < 0 || val > 100) {
      setMarginError("Enter a value between 0 and 100");
      return;
    }
    setMarginSaving(true);
    setMarginError(null);
    setMarginSuccess(false);
    try {
      const res = await fetch(`/api/publisher/placements/${placementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marginPercent: val }),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) throw new Error(data.error || "Failed to save");
      setPlacement((prev: any) => prev ? { ...prev, marginPercent: data.placement.marginPercent } : prev);
      setMarginSuccess(true);
      setTimeout(() => setMarginSuccess(false), 3000);
    } catch (err: any) {
      setMarginError(err.message || "Failed to save");
    } finally {
      setMarginSaving(false);
    }
  }

  const wallUrl = useMemo(() => {
    if (!placement) return "";
    const pid = placement.publisherId || publisherIdFromQuery;
    if (!pid) return "";
    return `${WALL_BASE_URL}?pid=${pid}&subid={USER_ID}&placement_id=${placement.id}`;
  }, [placement, publisherIdFromQuery]);

  /* ─────────── Load placement details ─────────── */
  useEffect(() => {
    if (!placementId) {
      setPlacementLoading(false);
      setPlacementError("Missing placement id in URL");
      return;
    }

    setPlacementLoading(true);
    setPlacementError(null);

    fetch(`/api/publisher/placements/${placementId}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const txt = await res.text();
        if (!txt) throw new Error("Empty placement response");

        const data = JSON.parse(txt);
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || "Failed to load placement");
        }

        setPlacement(data.placement);
      })
      .catch((err) => {
        console.error("PLACEMENT DETAIL FETCH ERROR:", err);
        setPlacementError(err.message || "Failed to load placement");
        setPlacement(null);
      })
      .finally(() => setPlacementLoading(false));
  }, [placementId]);

  /* ─────────── Load placement stats ─────────── */
  useEffect(() => {
    if (!placementId) {
      setStats(null);
      return;
    }

    setStatsLoading(true);
    setStatsError(null);

    fetch(
      `/api/publisher/placements/${placementId}/stats?days=${days}`,
      { cache: "no-store" }
    )
      .then(async (res) => {
        const txt = await res.text();
        if (!txt) {
          setStats(null);
          return;
        }
        const data = JSON.parse(txt);

        if (!res.ok || data.ok === false || data.error) {
          setStats(null);
          setStatsError(data.error || "Failed to load stats");
          return;
        }

        setStats({
          placementId: data.placementId,
          windowDays: data.windowDays,
          clicks: Number(data.clicks || 0),
          conversions: Number(data.conversions || 0),
          revenueUsd: Number(data.revenueUsd || 0),
          epc: Number(data.epc || 0),
          cr: Number(data.cr || 0),
        });
      })
      .catch((err) => {
        console.error("PLACEMENT STATS FETCH ERROR:", err);
        setStats(null);
        setStatsError(err.message || "Failed to load stats");
      })
      .finally(() => setStatsLoading(false));
  }, [placementId, days]);

  /* ─────────── Handlers ─────────── */
  const handleBack = () => {
    if (publisherIdFromQuery) {
      router.push(
        `/publisher/placements?publisherId=${encodeURIComponent(
          publisherIdFromQuery
        )}`
      );
    } else {
      router.push("/publisher/placements");
    }
  };

  const handleCopyWallUrl = async () => {
    if (!wallUrl) return;
    try {
      await navigator.clipboard.writeText(wallUrl);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy"), 1300);
    } catch (err) {
      console.error("Clipboard error:", err);
    }
  };

  const dayOptions: { label: string; value: DayOption }[] = [
    { label: "7d", value: 7 },
    { label: "30d", value: 30 },
    { label: "90d", value: 90 },
  ];

  /* ─────────── Render ─────────── */

  if (placementLoading) {
    return (
      <div className="max-w-5xl text-white">
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to placements
        </button>
        <div className="rounded-xl border border-white/10 bg-[#0d1117] p-6 text-sm text-gray-300">
          Loading placement…
        </div>
      </div>
    );
  }

  if (placementError || !placement) {
    return (
      <div className="max-w-5xl text-white">
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to placements
        </button>
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-6 text-sm text-red-200">
          {placementError || "Placement not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl text-white">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <button
            onClick={handleBack}
            className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Placements
          </button>
          <h1 className="text-3xl font-semibold">{placement.name}</h1>
          <p className="mt-1 text-sm text-gray-300">
            {placement.appName || "Unnamed app/site"} ·{" "}
            <span className="uppercase text-[11px] font-semibold text-emerald-300">
              {placement.platform}
            </span>{" "}
            · {placement.primaryGeo || "GLOBAL"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              placement.active
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                : "bg-gray-600/30 text-gray-200 border border-gray-500/40"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                placement.active ? "bg-emerald-400" : "bg-gray-400"
              }`}
            />
            {placement.active ? "Active" : "Paused"}
          </span>
          <div className="text-[11px] text-gray-400 font-mono">
            ID: {placement.id}
          </div>
        </div>
      </div>

      {/* Top row: Wall URL + stats */}
      <div className="mb-5 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Wall URL Card */}
        <div className="rounded-2xl border border-white/10 bg-[#050814]/90 p-4 shadow-[0_0_40px_rgba(5,8,20,0.8)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-emerald-300" />
              <h2 className="text-sm font-semibold">Wall URL</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-mono text-gray-200">
            <span className="truncate">{wallUrl || "—"}</span>
            <button
              type="button"
              onClick={handleCopyWallUrl}
              className="ml-2 inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold text-gray-100 hover:bg-white/10"
            >
              <Copy className="h-3 w-3" />
              {copyLabel}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Use this URL in your webview, iframe, or direct link. Replace{" "}
            <code className="px-1 rounded bg-black/40">{"{USER_ID}"}</code> with
            your internal user identifier.
          </p>
        </div>

        {/* Stats Card */}
        <div className="rounded-2xl border border-white/10 bg-[#050814]/90 p-4 shadow-[0_0_40px_rgba(5,8,20,0.8)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-sky-300" />
              <h2 className="text-sm font-semibold">
                Performance (last {stats?.windowDays ?? days} days)
              </h2>
            </div>
            <div className="inline-flex rounded-full bg-white/5 p-1 text-xs">
              {dayOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDays(opt.value)}
                  className={`rounded-full px-3 py-1 ${
                    days === opt.value
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {statsLoading && (
            <div className="text-[11px] text-gray-400 mb-2">
              Refreshing stats…
            </div>
          )}

          {stats ? (
            <>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-[0.16em]">
                    Clicks
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">
                    {stats.clicks.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-[0.16em]">
                    Conversions
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">
                    {stats.conversions.toLocaleString()}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-[0.16em]">
                    Revenue
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">
                    ${stats.revenueUsd.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-[0.16em]">
                    EPC
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">
                    ${stats.epc.toFixed(3)}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-[0.16em]">
                    CR
                  </div>
                  <div className="mt-1 text-base font-semibold text-white">
                    {stats.cr.toFixed(1)}%
                  </div>
                </div>
              </div>
            </>
          ) : statsError ? (
            <div className="text-[11px] text-red-300">{statsError}</div>
          ) : (
            <div className="text-[11px] text-gray-400">
              No activity yet for this placement. Stats will appear as traffic
              flows through your wall.
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: details + future chart slot */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Details */}
        <div className="rounded-2xl border border-white/10 bg-[#050814]/90 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-violet-300" />
            <h2 className="text-sm font-semibold">Placement details</h2>
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Site / app</dt>
              <dd className="text-gray-100">
                {placement.appName || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">URL / package</dt>
              <dd className="max-w-[260px] truncate text-right text-gray-100">
                {placement.url || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Primary GEO</dt>
              <dd className="text-gray-100">
                {placement.primaryGeo || "GLOBAL"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-400">Created</dt>
              <dd className="text-gray-100">
                {placement.createdAt
                  ? new Date(placement.createdAt).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
          </dl>

          {placement.notes && (
            <div className="mt-3 border-t border-white/10 pt-3 text-xs text-gray-300">
              <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-gray-500">
                Internal notes
              </div>
              <p className="whitespace-pre-wrap">{placement.notes}</p>
            </div>
          )}

          {/* Margin editor */}
          <div className="mt-4 border-t border-white/10 pt-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold">Publisher Margin</span>
              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                {placement.marginPercent ?? 0}% active
              </span>
            </div>
            <p className="mb-3 text-xs text-gray-400">
              Users see the offer payout reduced by this %. You collect the full amount and keep the difference as profit.
            </p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={marginInput}
                  onChange={(e) => setMarginInput(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
              <button
                type="button"
                onClick={saveMargin}
                disabled={marginSaving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {marginSaving ? "Saving…" : "Save"}
              </button>
            </div>
            {marginError && (
              <p className="mt-2 text-xs text-red-400">{marginError}</p>
            )}
            {marginSuccess && (
              <p className="mt-2 text-xs text-emerald-400">Margin updated — offers will reflect the new value immediately.</p>
            )}
            {Number(marginInput) > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                Example: a $100 offer → user sees <span className="text-white font-medium">${(100 * (1 - Number(marginInput) / 100)).toFixed(2)}</span>, you earn <span className="text-emerald-400 font-medium">$100</span>
              </p>
            )}
          </div>
        </div>

        {/* Placeholder future chart / logs */}
        <div className="rounded-2xl border border-white/10 bg-[#050814]/90 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-300" />
            <h2 className="text-sm font-semibold">Daily performance</h2>
          </div>
          <p className="text-xs text-gray-400">
            Later we can drop in a small chart here using the{" "}
            <code className="px-1 rounded bg-black/40">daily</code> and{" "}
            <code className="px-1 rounded bg-black/40">hourly</code>{" "}
            breakdowns from the stats API. For now, the key metrics above are
            fully live.
          </p>
          {publisherIdFromQuery && (
            <p className="mt-3 text-[11px] text-gray-500">
              Back to{" "}
              <Link
                href={`/publisher/placements?publisherId=${encodeURIComponent(
                  publisherIdFromQuery
                )}`}
                className="text-blue-400 hover:underline"
              >
                placements overview
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlacementDetailPage() {
  return (
    <Suspense>
      <PlacementDetailPageInner />
    </Suspense>
  );
}
