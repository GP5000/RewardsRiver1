// app/admin/placements/[id]/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

type PlacementStats = {
  impressions: number;
  clicks: number;
  conversions: number;
  revenueUsd: number;
  epcUsd: number;
};

type PlacementDetail = {
  id: string;
  name: string;
  publisherId: string | null;
  publisherName: string | null;
  url: string;
  status: "active" | "inactive";
  active: boolean;
  createdAt: string | null;
  stats: PlacementStats | null;
};

function isAdmin(session: any | null) {
  if (!session?.user) return false;
  const u = session.user as any;
  return (
    u.role === "admin" ||
    u.isAdmin === true ||
    (process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
      u.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL)
  );
}

function formatMoney(v: number) {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function PlacementDetailInner() {
  const { data: session, status: sessionStatus } = useSession();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const placementId = params?.id as string | undefined;

  const [placement, setPlacement] = useState<PlacementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      if (!placementId) return;
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/placements/${placementId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load placement");
      }

      setPlacement(data.placement as PlacementDetail);
    } catch (err: any) {
      console.error("ADMIN PLACEMENT DETAIL ERROR:", err);
      setError(err?.message ?? "Failed to load placement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      placementId &&
      sessionStatus === "authenticated" &&
      isAdmin(session)
    ) {
      void load();
    }
  }, [placementId, sessionStatus, session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive() {
    if (!placement) return;
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/admin/placements/${placement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !placement.active }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update placement");
      }

      setPlacement((prev) => (prev ? { ...prev, active: !prev.active } : prev));
    } catch (err: any) {
      console.error("ADMIN PLACEMENT TOGGLE ERROR:", err);
      setError(err?.message ?? "Failed to update placement");
    } finally {
      setSaving(false);
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-sm text-slate-400">Checking admin session…</p>
      </div>
    );
  }

  if (!isAdmin(session)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-6 py-4 text-center">
          <h1 className="text-lg font-semibold text-red-100">
            Admin access required
          </h1>
          <p className="mt-1 text-sm text-red-200/80">
            You must be an admin to view placement details.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !placement) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
          <p className="text-sm text-slate-400">Loading placement…</p>
        </div>
      </div>
    );
  }

  const stats: PlacementStats = placement.stats || {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    revenueUsd: 0,
    epcUsd: 0,
  };

  const statusClass = placement.active
    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
    : "bg-slate-600/40 text-slate-100 border border-slate-500/40";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        {/* Header / breadcrumb */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <button
              onClick={() => router.push("/admin/placements")}
              className="mb-2 text-xs font-medium text-slate-400 hover:text-cyan-300"
            >
              ← Back to placements
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
                {placement.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${statusClass}`}
              >
                {placement.active ? "active" : "inactive"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Publisher:{" "}
              {placement.publisherName || "Unknown publisher"} • Created{" "}
              {placement.createdAt
                ? new Date(placement.createdAt).toLocaleDateString()
                : "Unknown"}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Revenue
            </div>
            <div className="text-xl font-semibold text-emerald-300">
              {formatMoney(stats.revenueUsd)}
            </div>
            <div className="text-xs text-slate-400">
              EPC:{" "}
              <span className="font-medium text-cyan-300">
                {formatMoney(stats.epcUsd)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* Metrics cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Traffic
            </h2>
            <div className="flex gap-6 text-sm text-slate-300">
              <div>
                <div className="text-xs text-slate-500">Impressions</div>
                <div className="text-lg font-semibold text-slate-100">
                  {stats.impressions}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Clicks</div>
                <div className="text-lg font-semibold text-sky-300">
                  {stats.clicks}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Conversions</div>
                <div className="text-lg font-semibold text-emerald-300">
                  {stats.conversions}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Placement URL
            </h2>
            <div className="text-sm text-slate-300">
              {placement.url ? (
                <a
                  href={
                    placement.url.startsWith("http")
                      ? placement.url
                      : `https://${placement.url}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-cyan-300 hover:underline"
                >
                  {placement.url}
                </a>
              ) : (
                "No domain set"
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Controls
            </h2>
            <button
              onClick={toggleActive}
              disabled={saving}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                placement.active
                  ? "border-amber-500/70 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
                  : "border-emerald-500/70 bg-emerald-600/80 text-emerald-50 hover:bg-emerald-500"
              } border disabled:opacity-50`}
            >
              {saving
                ? "Saving…"
                : placement.active
                ? "Deactivate"
                : "Activate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPlacementDetailPage() {
  return (
    <SessionProvider>
      <PlacementDetailInner />
    </SessionProvider>
  );
}
