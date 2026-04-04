"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import Link from "next/link";

type PublisherItem = {
  id: string;
  name: string;
  email: string | null;
  website: string | null;
  status: "active" | "pending" | "suspended";
  createdAt: string | null;
  placementsCount: number;
  totalClicks: number;
  totalConversions: number;
  totalRevenueUsd: number;
  balanceUsd: number;
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

function AdminPublishersInner() {
  const { data: session, status: sessionStatus } = useSession();

  const [items, setItems] = useState<PublisherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"" | PublisherItem["status"]>("");

  async function fetchPublishers() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/publishers?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || `Failed to load publishers (HTTP ${res.status})`
        );
      }

      setItems(data.items || []);
    } catch (err: any) {
      console.error("ADMIN PUBLISHERS ERROR:", err);
      setError(err?.message ?? "Failed to load publishers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated" && isAdmin(session)) {
      void fetchPublishers();
    }
  }, [sessionStatus, session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updatePublisherStatus(
    id: string,
    status: PublisherItem["status"]
  ) {
    try {
      const res = await fetch(`/api/admin/publishers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to update publisher");
      }

      setItems((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );
    } catch (err: any) {
      console.error("ADMIN PUBLISHER STATUS ERROR:", err);
      setError(err?.message ?? "Failed to update publisher");
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-sm text-slate-300">Checking admin session…</p>
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
            You must be an admin to manage publishers.
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
              Publishers
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage publishers, monitor performance, and review account status.
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
                placeholder="Search by name, email, website..."
                className="w-full rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as PublisherItem["status"] | "")
                }
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => fetchPublishers()}
            className="self-start rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
          >
            Refresh
          </button>
        </section>

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
                  <th className="px-4 py-3 text-left">Publisher</th>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-left">Performance</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-slate-400"
                    >
                      Loading publishers…
                    </td>
                  </tr>
                )}

                {!loading && items.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-6 text-center text-sm text-slate-400"
                    >
                      No publishers found.
                    </td>
                  </tr>
                )}

                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="transition-colors hover:bg-slate-900/90"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-semibold text-cyan-200">
                          {String(p.name || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-50">
                            {p.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {p.email || "No email"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-300">
                      <div>{p.website || "No website"}</div>
                      <div>Placements: {p.placementsCount}</div>
                      <div>
                        Joined:{" "}
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString()
                          : "Unknown"}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-300">
                      <div>Clicks: {p.totalClicks}</div>
                      <div>Conversions: {p.totalConversions}</div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <div className="text-sm font-semibold text-emerald-300">
                        ${p.totalRevenueUsd.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Balance: ${p.balanceUsd.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.status === "active"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : p.status === "pending"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-rose-500/15 text-rose-300"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2 text-[11px]">
                        <Link
                          href={`/admin/publishers/${p.id}`}
                          className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
                        >
                          View
                        </Link>

                        <button
                          onClick={() => updatePublisherStatus(p.id, "active")}
                          className="rounded-full border border-emerald-500/70 bg-emerald-700/30 px-2.5 py-1 text-emerald-100 hover:bg-emerald-700/50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => updatePublisherStatus(p.id, "pending")}
                          className="rounded-full border border-amber-500/70 bg-amber-700/30 px-2.5 py-1 text-amber-100 hover:bg-amber-700/50"
                        >
                          Under review
                        </button>
                        <button
                          onClick={() =>
                            updatePublisherStatus(p.id, "suspended")
                          }
                          className="rounded-full border border-rose-500/70 bg-rose-800/40 px-2.5 py-1 text-rose-100 hover:bg-rose-800/60"
                        >
                          Ban
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AdminPublishersPage() {
  return (
    <SessionProvider>
      <AdminPublishersInner />
    </SessionProvider>
  );
}
