"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; // ⬅️ add this
type PlacementStatus = "active" | "inactive";

type PlacementListItem = {
  id: string;
  name: string;
  key: string;
  domain: string;
  publisherName: string;
  publisherId: string | null;
  type: string;
  status: PlacementStatus;
  createdAt: string | null;
  stats: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenueUsd: number;
    epcUsd: number;
  };
};

export default function AdminPlacementsPage() {
  const { data: session, status: sessionStatus } = useSession();

  const [items, setItems] = useState<PlacementListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlacementStatus | "">("");
  const router = useRouter(); // ⬅️ add this
  const [busyPlacementId, setBusyPlacementId] = useState<string | null>(null);

  const isAdmin =
    !!session &&
    ((session.user as any)?.role === "admin" ||
      (session.user as any)?.isAdmin === true ||
      (process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
        (session.user as any)?.email ===
          process.env.NEXT_PUBLIC_ADMIN_EMAIL));

  async function fetchPlacements() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/placements?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load placements");
      }

      setItems(data.items || []);
    } catch (err: any) {
      console.error("ADMIN PLACEMENTS FETCH ERROR:", err);
      setError(err?.message ?? "Failed to load placements");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated" && isAdmin) {
      void fetchPlacements();
    }
  }, [sessionStatus, isAdmin]);

  async function updatePlacementActive(
    placementId: string,
    active: boolean,
    publisherId: string | null
  ) {
    try {
      if (!placementId) {
        throw new Error("Placement id is required");
      }
      if (!publisherId) {
        // you can relax this if you don’t actually need it
        throw new Error("Publisher id is required");
      }

      setBusyPlacementId(placementId);
      setError(null);

      const res = await fetch(`/api/admin/placements/${placementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update placement");
      }

      setItems((prev) =>
        prev.map((p) =>
          p.id === placementId ? { ...p, status: active ? "active" : "inactive" } : p
        )
      );
    } catch (err: any) {
      console.error("ADMIN PLACEMENT ACTIVE ERROR:", err);
      setError(err?.message ?? "Failed to update placement");
    } finally {
      setBusyPlacementId(null);
    }
  }

  const filtered = useMemo(() => items, [items]);

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-sm text-slate-400">Checking admin session…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-6 py-4 text-center">
          <h1 className="text-lg font-semibold text-red-100">
            Admin access required
          </h1>
          <p className="mt-1 text-sm text-red-200/80">
            You must be an admin to view placements.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
              Admin
            </p>
            <h1 className="mt-1 bg-gradient-to-r from-cyan-300 via-sky-400 to-emerald-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
              Placements
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage publisher placements and monitor widget performance.
            </p>
          </div>
        </header>

        {/* Filters */}
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, domain, publisher…"
                className="w-full rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as PlacementStatus | "")
                }
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => fetchPlacements()}
            className="self-start rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
          >
            Refresh
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="mb-3 rounded-xl border border-rose-500/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <div className="max-h-[65vh] overflow-auto text-sm">
            <table className="min-w-full divide-y divide-slate-800/80">
              <thead className="bg-slate-950/60 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Placement</th>
                  <th className="px-4 py-3 text-left">Publisher</th>
                  <th className="px-4 py-3 text-left">Performance</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-slate-400"
                    >
                      Loading placements…
                    </td>
                  </tr>
                )}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-slate-400"
                    >
                      No placements found.
                    </td>
                  </tr>
                )}

                {filtered.map((p) => {
                  const active = p.status === "active";
                  return (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-slate-900/90"
                    >
                      {/* Placement */}
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-semibold text-cyan-200">
                            {String(p.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-50">
                              {p.name || "Untitled placement"}
                            </div>
                            <div className="text-xs text-slate-400">
                              {p.domain || "No domain set"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Publisher */}
                      <td className="px-4 py-3 align-top">
                        <div className="text-sm text-slate-100">
                          {p.publisherName || "Unknown publisher"}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Platform: web
                        </div>
                      </td>

                      {/* Performance */}
                      <td className="px-4 py-3 align-top text-xs text-slate-300">
                        <div>Impressions: {p.stats.impressions ?? 0}</div>
                        <div>Clicks: {p.stats.clicks ?? 0}</div>
                        <div>Conv.: {p.stats.conversions ?? 0}</div>
                      </td>

                      {/* Revenue */}
                      <td className="px-4 py-3 text-right align-top">
                        <div className="text-sm font-semibold text-emerald-300">
                          ${p.stats.revenueUsd.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          EPC: ${p.stats.epcUsd.toFixed(3)}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-right align-top">
                        <span
                          className={`inline-flex items-center justify-end rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            active
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-slate-600/20 text-slate-300"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                     {/* Actions */}
<td className="px-4 py-3 text-right align-top">
  <div className="flex justify-end gap-2 text-xs">

    {/* View Button */}
    <button
      type="button"
      onClick={() => router.push(`/admin/placements/${p.id}`)}
      className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
    >
      View
    </button>

    {/* Activate / Deactivate Button */}
    <button
      type="button"
      disabled={busyPlacementId === p.id}
      onClick={() =>
        updatePlacementActive(p.id, !active, p.publisherId)
      }
      className={`rounded-full px-2.5 py-1 text-[11px] ${
        active
          ? "border-amber-500/70 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25"
          : "border-emerald-500/70 bg-emerald-600/80 text-emerald-50 hover:bg-emerald-500"
      } border disabled:opacity-50`}
    >
      {busyPlacementId === p.id
        ? "Saving…"
        : active
        ? "Deactivate"
        : "Activate"}
    </button>

  </div>
</td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
