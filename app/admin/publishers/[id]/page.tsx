// app/admin/publishers/[id]/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";

type PublisherStatus = "active" | "pending" | "suspended";

type PublisherDetail = {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  status: PublisherStatus;
  createdAt: string | null;
  placementsCount: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenueUsd: number;
  balanceUsd: number;
};

type PlacementSummary = {
  id: string;
  name: string;
  url: string;
  status: "active" | "inactive";
  createdAt: string | null;
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

function PublisherDetailInner() {
  const { data: session, status: sessionStatus } = useSession();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const publisherId = params?.id as string | undefined;

  const [publisher, setPublisher] = useState<PublisherDetail | null>(null);
  const [placements, setPlacements] = useState<PlacementSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      if (!publisherId) return;
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/admin/publishers/${publisherId}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || `Failed to load publisher`);
      }

      setPublisher(data.publisher as PublisherDetail);
      setPlacements((data.placements || []) as PlacementSummary[]);
    } catch (err: any) {
      console.error("ADMIN PUBLISHER DETAIL ERROR:", err);
      setError(err?.message ?? "Failed to load publisher");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      publisherId &&
      sessionStatus === "authenticated" &&
      isAdmin(session)
    ) {
      void load();
    }
  }, [publisherId, sessionStatus, session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeStatus(status: PublisherStatus) {
    if (!publisher) return;
    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/admin/publishers/${publisher.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update publisher");
      }

      setPublisher((prev) => (prev ? { ...prev, status } : prev));
    } catch (err: any) {
      console.error("ADMIN PUBLISHER STATUS ERROR:", err);
      setError(err?.message ?? "Failed to update publisher");
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
            You must be an admin to view publisher details.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !publisher) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8">
          <p className="text-sm text-slate-400">Loading publisher…</p>
        </div>
      </div>
    );
  }

  const statusClass =
    publisher.status === "active"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
      : publisher.status === "pending"
      ? "bg-amber-500/15 text-amber-300 border border-amber-500/40"
      : "bg-rose-500/15 text-rose-300 border border-rose-500/40";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        {/* Breadcrumb / header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <button
              onClick={() => router.push("/admin/publishers")}
              className="mb-2 text-xs font-medium text-slate-400 hover:text-cyan-300"
            >
              ← Back to publishers
            </button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
                {publisher.name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium ${statusClass}`}
              >
                {publisher.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Joined{" "}
              {publisher.createdAt
                ? new Date(publisher.createdAt).toLocaleDateString()
                : "Unknown"}
              . {publisher.placementsCount} placements.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Total revenue
            </div>
            <div className="text-xl font-semibold text-emerald-300">
              {formatMoney(publisher.totalRevenueUsd)}
            </div>
            <div className="text-xs text-slate-400">
              Balance:{" "}
              <span className="font-medium text-cyan-300">
                {formatMoney(publisher.balanceUsd)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* Top cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {/* Account */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Account
            </h2>
            <div className="text-sm text-slate-300">
              <div className="mb-1">
                <span className="text-slate-500">Email:</span>{" "}
                {publisher.email || "No email"}
              </div>
              <div className="mb-1">
                <span className="text-slate-500">Website:</span>{" "}
                {publisher.website ? (
                  <a
                    href={
                      publisher.website.startsWith("http")
                        ? publisher.website
                        : `https://${publisher.website}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-300 hover:underline"
                  >
                    {publisher.website}
                  </a>
                ) : (
                  "No website"
                )}
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Performance
            </h2>
            <div className="flex gap-6 text-sm text-slate-300">
              <div>
                <div className="text-xs text-slate-500">Clicks</div>
                <div className="text-lg font-semibold text-sky-300">
                  {publisher.totalClicks}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Conversions</div>
                <div className="text-lg font-semibold text-emerald-300">
                  {publisher.totalConversions}
                </div>
              </div>
            </div>
          </div>

          {/* Status controls */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Status controls
            </h2>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                onClick={() => changeStatus("active")}
                disabled={saving}
                className="rounded-full border border-emerald-500/70 bg-emerald-700/30 px-3 py-1 font-medium text-emerald-100 hover:bg-emerald-700/50 disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => changeStatus("pending")}
                disabled={saving}
                className="rounded-full border border-amber-500/70 bg-amber-700/30 px-3 py-1 font-medium text-amber-100 hover:bg-amber-700/50 disabled:opacity-60"
              >
                Under review
              </button>
              <button
                onClick={() => changeStatus("suspended")}
                disabled={saving}
                className="rounded-full border border-rose-500/70 bg-rose-800/40 px-3 py-1 font-medium text-rose-100 hover:bg-rose-800/60 disabled:opacity-60"
              >
                Ban
              </button>
            </div>
            {saving && (
              <p className="mt-2 text-[11px] text-slate-400">
                Updating status…
              </p>
            )}
          </div>
        </div>

        {/* Placements list */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Placements
            </h2>
            <span className="text-xs text-slate-500">
              {placements.length} recent placements
            </span>
          </div>
          {placements.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">
              This publisher has no placements yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70 text-sm">
              {placements.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-900/90"
                >
                  <div className="min-w-0">
                    <div className="truncate text-slate-50">{p.name}</div>
                    <div className="truncate text-xs text-slate-400">
                      {p.url || "No domain set"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-slate-600/40 text-slate-200"
                      }`}
                    >
                      {p.status}
                    </span>
                    <button
                      onClick={() => router.push(`/admin/placements/${p.id}`)}
                      className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminPublisherDetailPage() {
  return (
    <SessionProvider>
      <PublisherDetailInner />
    </SessionProvider>
  );
}
