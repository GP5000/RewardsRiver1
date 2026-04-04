"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";

type DeviceTarget = "all" | "desktop" | "mobile";
type PlatformTarget = "web" | "android" | "ios";
type OfferStatus = "active" | "paused" | "archived";

type OfferListItem = {
  id: string;
  name: string;
  title: string;
  network: string;
  externalOfferId: string | null;
  status: OfferStatus;
  payoutUsd: number;
  advertiserPayoutUsd: number | null;
  estimatedMinutes: number | null;
  category: string | null;
  badge: string | null;
  deviceTarget: DeviceTarget;
  geoAllow: string[];
  geoDeny: string[];
  placementIds: string[];
  imageUrl: string | null;
  stats: {
    clicks: number;
    conversions: number;
    epcUsd: number;
    revPubUsd: number;
    revAdvUsd: number;
  };
  createdAt: string;
};

type OfferFormState = {
  id?: string;
  name: string;
  title: string;
  description: string;
  network: string;
  externalOfferId: string;
  redirectUrl: string;
  payoutUsd: string;
  advertiserPayoutUsd: string;
  estimatedMinutes: string;
  category: string;
  badge: string;
  geoAllow: string;
  geoDeny: string;
  deviceTarget: DeviceTarget;
  platforms: PlatformTarget[];
  placementIds: string;
  dailyCap: string;
  imageUrl: string;
  status: OfferStatus;
};

const emptyForm: OfferFormState = {
  name: "",
  title: "",
  description: "",
  network: "",
  externalOfferId: "",
  redirectUrl: "",
  payoutUsd: "",
  advertiserPayoutUsd: "",
  estimatedMinutes: "",
  category: "",
  badge: "",
  geoAllow: "",
  geoDeny: "",
  deviceTarget: "all",
  platforms: [],
  placementIds: "",
  dailyCap: "",
  imageUrl: "",
  status: "active",
};

/* ------------------------------------------------------------------ */
/* Inner component – uses useSession and holds all page logic         */
/* ------------------------------------------------------------------ */

function AdminOffersInner() {
  const { data: session, status: sessionStatus } = useSession();

  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [networkFilter, setNetworkFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferStatus | "">("");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<OfferFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin =
    !!session &&
    ((session.user as any)?.role === "admin" ||
      (session.user as any)?.isAdmin === true ||
      (session.user as any)?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);

  /* ---------------------- Load offers list ------------------------ */

  async function fetchOffers() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (networkFilter.trim()) params.set("network", networkFilter.trim());
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/offers?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(
          data?.error || `Failed to load offers (HTTP ${res.status})`
        );
      }

      const items: any[] = Array.isArray(data.items) ? data.items : [];

      const normalized: OfferListItem[] = items.map((item: any): OfferListItem => {
        const stats = item.stats || {};
        const geoAllow = Array.isArray(item.geoAllow) ? item.geoAllow : [];
        const geoDeny = Array.isArray(item.geoDeny) ? item.geoDeny : [];
        const placementIds = Array.isArray(item.placementIds)
          ? item.placementIds
          : [];

        const safeTitle =
          item.title ||
          item.name ||
          "Untitled offer";

        return {
          id: String(item.id ?? item._id ?? ""),
          name: String(item.name ?? ""),
          title: String(safeTitle),
          network: String(item.network ?? ""),
          externalOfferId:
            item.externalOfferId != null ? String(item.externalOfferId) : null,
          status: (item.status as OfferStatus) ?? "active",
          payoutUsd: Number.isFinite(Number(item.payoutUsd))
            ? Number(item.payoutUsd)
            : 0,
          advertiserPayoutUsd:
            item.advertiserPayoutUsd != null &&
            Number.isFinite(Number(item.advertiserPayoutUsd))
              ? Number(item.advertiserPayoutUsd)
              : null,
          estimatedMinutes:
            item.estimatedMinutes != null &&
            Number.isFinite(Number(item.estimatedMinutes))
              ? Number(item.estimatedMinutes)
              : null,
          category: item.category != null ? String(item.category) : null,
          badge: item.badge != null ? String(item.badge) : null,
          deviceTarget: (item.deviceTarget as DeviceTarget) ?? "all",
          geoAllow,
          geoDeny,
          placementIds,
          imageUrl: item.imageUrl != null ? String(item.imageUrl) : null,
          stats: {
            clicks: Number.isFinite(Number(stats.clicks))
              ? Number(stats.clicks)
              : 0,
            conversions: Number.isFinite(Number(stats.conversions))
              ? Number(stats.conversions)
              : 0,
            epcUsd: Number.isFinite(Number(stats.epcUsd))
              ? Number(stats.epcUsd)
              : 0,
            revPubUsd: Number.isFinite(Number(stats.revPubUsd))
              ? Number(stats.revPubUsd)
              : 0,
            revAdvUsd: Number.isFinite(Number(stats.revAdvUsd))
              ? Number(stats.revAdvUsd)
              : 0,
          },
          createdAt:
            typeof item.createdAt === "string"
              ? item.createdAt
              : new Date().toISOString(),
        };
      });

      setOffers(normalized);
    } catch (err: any) {
      console.error("ADMIN OFFERS FETCH ERROR:", err);
      setError(err?.message ?? "Unable to load offers.");
      setOffers([]); // avoid rendering with stale/bad shape
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sessionStatus === "authenticated" && isAdmin) {
      void fetchOffers();
    }
  }, [sessionStatus, isAdmin, query, networkFilter, statusFilter]);

  /* ---------------------- Form helpers ---------------------------- */

  function openCreateDrawer() {
    setForm(emptyForm);
    setDrawerOpen(true);
  }

  function openEditDrawer(o: OfferListItem) {
    setForm({
      id: o.id,
      name: o.name || "",
      title: o.title || "",
      description: "",
      network: o.network || "",
      externalOfferId: o.externalOfferId ?? "",
      redirectUrl: "",
      payoutUsd: (o.payoutUsd ?? 0).toString(),
      advertiserPayoutUsd: o.advertiserPayoutUsd != null
        ? o.advertiserPayoutUsd.toString()
        : "",
      estimatedMinutes:
        o.estimatedMinutes != null ? o.estimatedMinutes.toString() : "",
      category: o.category ?? "",
      badge: o.badge ?? "",
      geoAllow: Array.isArray(o.geoAllow) ? o.geoAllow.join(",") : "",
      geoDeny: Array.isArray(o.geoDeny) ? o.geoDeny.join(",") : "",
      deviceTarget: o.deviceTarget || "all",
      platforms: [],
      placementIds: "",
      dailyCap: "",
      imageUrl: o.imageUrl ?? "",
      status: o.status || "active",
    });

    // Load full offer details for edit (redirectUrl, platforms, placementIds, etc.)
    void (async () => {
      try {
        const res = await fetch(`/api/admin/offers/${o.id}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!data?.ok || !data.item) return;
        const item = data.item;

        setForm((prev) => ({
          ...prev,
          description: item.description || "",
          redirectUrl: item.redirectUrl || "",
          geoAllow: Array.isArray(item.geoAllow)
            ? item.geoAllow.join(",")
            : prev.geoAllow,
          geoDeny: Array.isArray(item.geoDeny)
            ? item.geoDeny.join(",")
            : prev.geoDeny,
          platforms: Array.isArray(item.platforms) ? item.platforms : prev.platforms,
          placementIds: Array.isArray(item.placementIds)
            ? item.placementIds.join(",")
            : prev.placementIds,
          dailyCap:
            item.dailyCap != null && item.dailyCap !== ""
              ? String(item.dailyCap)
              : prev.dailyCap,
        }));
      } catch (err) {
        console.error("Failed to load full offer for edit", err);
      }
    })();

    setDrawerOpen(true);
  }

  function handleFormChange<K extends keyof OfferFormState>(
    key: K,
    value: OfferFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /* ---------------------- Save (create / update) ------------------ */

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: form.name.trim(),
        title: form.title.trim() || form.name.trim() || "Untitled offer",
        description: form.description.trim(),
        network: form.network.trim(),
        externalOfferId: form.externalOfferId.trim() || undefined,
        redirectUrl: form.redirectUrl.trim(),
        payoutUsd: Number(form.payoutUsd || 0),
        advertiserPayoutUsd: form.advertiserPayoutUsd
          ? Number(form.advertiserPayoutUsd)
          : undefined,
        estimatedMinutes: form.estimatedMinutes
          ? Number(form.estimatedMinutes)
          : undefined,
        category: form.category.trim() || undefined,
        badge: form.badge.trim() || undefined,
        geoAllow: form.geoAllow
          ? form.geoAllow
              .split(",")
              .map((g) => g.trim().toUpperCase())
              .filter(Boolean)
          : [],
        geoDeny: form.geoDeny
          ? form.geoDeny
              .split(",")
              .map((g) => g.trim().toUpperCase())
              .filter(Boolean)
          : [],
        deviceTarget: form.deviceTarget,
        platforms: form.platforms,
        placementIds: form.placementIds
          ? form.placementIds
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
          : [],
        dailyCap: form.dailyCap ? Number(form.dailyCap) : undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        status: form.status,
      };

      const isEdit = !!form.id;
      const url = isEdit
        ? `/api/admin/offers/${form.id}`
        : "/api/admin/offers";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save offer");
      }

      setDrawerOpen(false);
      await fetchOffers();
    } catch (err: any) {
      console.error("SAVE OFFER ERROR:", err);
      setError(err?.message ?? "Failed to save offer.");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------- Delete ------------------------- */

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this offer?")) return;

    try {
      setDeletingId(id);
      const res = await fetch(`/api/admin/offers/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to delete offer");
      }
      await fetchOffers();
    } catch (err: any) {
      console.error("DELETE OFFER ERROR:", err);
      setError(err?.message ?? "Failed to delete offer.");
    } finally {
      setDeletingId(null);
    }
  }

  /* ---------------------- Derived filters ------------------------- */

  const uniqueNetworks = useMemo(
    () =>
      Array.from(
        new Set(
          offers.map((o) =>
            (o.network || "").trim() ? o.network : "Unknown"
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [offers]
  );

  const filteredOffers = offers; // server-side filters already applied

  /* ---------------------- Render ------------------------- */

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-sm text-slate-300">Checking admin session…</p>
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
            You must be an admin to manage offers.
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
              Offer Manager
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Create, target, and optimize offers for RewardsRiver placements.
            </p>
          </div>

          <button
            onClick={openCreateDrawer}
            className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.65)] transition hover:bg-cyan-400"
          >
            + New Offer
          </button>
        </header>

        {/* Filters */}
        <section className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, title, network…"
                className="w-full rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={networkFilter}
                onChange={(e) => setNetworkFilter(e.target.value)}
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All networks</option>
                {uniqueNetworks.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as OfferStatus | "")
                }
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 focus:border-cyan-400 focus:outline-none"
              >
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => fetchOffers()}
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
                  <th className="px-4 py-3 text-left">Offer</th>
                  <th className="px-4 py-3 text-left">Network</th>
                  <th className="px-4 py-3 text-left">Targeting</th>
                  <th className="px-4 py-3 text-right">Reward</th>
                  <th className="px-4 py-3 text-right">EPC</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Conv.</th>
                  <th className="px-4 py-3 text-right">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {loading && filteredOffers.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-slate-400"
                    >
                      Loading offers…
                    </td>
                  </tr>
                )}

                {!loading && filteredOffers.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-slate-400"
                    >
                      No offers found. Create your first offer to get started.
                    </td>
                  </tr>
                )}

                {filteredOffers.map((o, index) => {
                  const geoAllow = Array.isArray(o.geoAllow) ? o.geoAllow : [];
                  const safeTitle =
                    o.title || o.name || "Untitled offer";

                  const safeReward = Number.isFinite(o.payoutUsd as any)
                    ? Number(o.payoutUsd)
                    : 0;

                  const safeAdvPayout =
                    o.advertiserPayoutUsd != null &&
                    Number.isFinite(o.advertiserPayoutUsd as any)
                      ? Number(o.advertiserPayoutUsd)
                      : null;

                  const stats = o.stats || ({} as OfferListItem["stats"]);
                  const safeEpc = Number.isFinite(stats.epcUsd as any)
                    ? Number(stats.epcUsd)
                    : 0;
                  const safeClicks = Number.isFinite(stats.clicks as any)
                    ? Number(stats.clicks)
                    : 0;
                  const safeConversions = Number.isFinite(
                    stats.conversions as any
                  )
                    ? Number(stats.conversions)
                    : 0;

                  const status = o.status || "active";
                  const rowKey = o.id || `${safeTitle}-${index}`;

                  return (
                    <tr
                      key={rowKey}
                      className="transition-colors hover:bg-slate-900/90"
                    >
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-center gap-3">
                          {o.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={o.imageUrl}
                              alt={safeTitle}
                              className="h-9 w-9 flex-shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 text-xs font-semibold text-cyan-200">
                              {String(safeTitle || "?")
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div className="text-sm font-medium text-slate-50">
                              {safeTitle}
                            </div>
                            <div className="text-xs text-slate-400">
                              {o.name || "—"}
                              {o.badge && (
                                <>
                                  {" "}
                                  ·{" "}
                                  <span className="text-emerald-300">
                                    {o.badge}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="text-sm text-slate-100">
                          {o.network || "Unknown"}
                        </div>
                        {o.externalOfferId && (
                          <div className="text-[11px] text-slate-500">
                            ID: {o.externalOfferId}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-1 text-[11px] text-slate-300">
                          <span className="rounded-full bg-slate-800/80 px-2 py-0.5">
                            {o.deviceTarget === "all"
                              ? "Desktop + Mobile"
                              : o.deviceTarget || "all"}
                          </span>
                          {geoAllow.length > 0 && (
                            <span className="rounded-full bg-slate-800/80 px-2 py-0.5">
                              GEO: {geoAllow.slice(0, 3).join(",")}
                              {geoAllow.length > 3 && "…"}
                            </span>
                          )}
                          {o.category && (
                            <span className="rounded-full bg-slate-800/80 px-2 py-0.5">
                              {o.category}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <div className="text-sm font-semibold text-emerald-300">
                          ${safeReward.toFixed(2)}
                        </div>
                        {safeAdvPayout != null && (
                          <div className="text-[11px] text-slate-400">
                            Payout: ${safeAdvPayout.toFixed(2)}
                          </div>
                        )}
                        {o.estimatedMinutes != null && (
                          <div className="text-[11px] text-slate-500">
                            ~{o.estimatedMinutes} min
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <div className="text-sm text-slate-100">
                          ${safeEpc.toFixed(3)}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <div className="text-sm text-slate-100">
                          {safeClicks.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <div className="text-sm text-slate-100">
                          {safeConversions.toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <span
                          className={`inline-flex items-center justify-end rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            status === "active"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : status === "paused"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-slate-600/20 text-slate-300"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right align-top">
                        <div className="flex justify-end gap-2 text-xs">
                          <button
                            onClick={() => openEditDrawer(o)}
                            className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(o.id)}
                            disabled={deletingId === o.id}
                            className="rounded-full border border-rose-600/70 bg-rose-800/40 px-2.5 py-1 text-[11px] text-rose-100 hover:bg-rose-700/60 disabled:opacity-50"
                          >
                            {deletingId === o.id ? "Deleting…" : "Delete"}
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

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[1200] flex justify-end bg-black/70">
          <div className="h-full w-full max-w-xl border-l border-slate-800 bg-slate-950/95 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-50">
                  {form.id ? "Edit Offer" : "New Offer"}
                </h2>
                <p className="text-xs text-slate-400">
                  Configure targeting, payouts, and presentation.
                </p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-lg text-slate-400 hover:text-slate-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSave}
              className="flex h-[calc(100%-3rem)] flex-col gap-4 overflow-y-auto pr-1 text-sm"
            >
              {/* Basic info */}
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Basic
                </h3>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Internal name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Public title
                  </label>
                  <input
                    value={form.title}
                    onChange={(e) => handleFormChange("title", e.target.value)}
                    required
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      handleFormChange("description", e.target.value)
                    }
                    rows={2}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </section>

              {/* Network & URLs */}
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Network & URLs
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Network
                    </label>
                    <input
                      value={form.network}
                      onChange={(e) =>
                        handleFormChange("network", e.target.value)
                      }
                      placeholder="Lootably, Revu, Adscend, Custom…"
                      required
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      External offer ID
                    </label>
                    <input
                      value={form.externalOfferId}
                      onChange={(e) =>
                        handleFormChange("externalOfferId", e.target.value)
                      }
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Final redirect URL
                  </label>
                  <input
                    value={form.redirectUrl}
                    onChange={(e) =>
                      handleFormChange("redirectUrl", e.target.value)
                    }
                    required
                    placeholder="https://example.com/offer-page"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </section>

              {/* Economics */}
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Reward & Payout
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Reward (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.payoutUsd}
                      onChange={(e) =>
                        handleFormChange("payoutUsd", e.target.value)
                      }
                      required
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Advertiser payout (USD)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.advertiserPayoutUsd}
                      onChange={(e) =>
                        handleFormChange("advertiserPayoutUsd", e.target.value)
                      }
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Est. minutes
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.estimatedMinutes}
                      onChange={(e) =>
                        handleFormChange("estimatedMinutes", e.target.value)
                      }
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Category
                    </label>
                    <input
                      value={form.category}
                      onChange={(e) =>
                        handleFormChange("category", e.target.value)
                      }
                      placeholder="Surveys, Apps & Games…"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Badge
                    </label>
                    <input
                      value={form.badge}
                      onChange={(e) =>
                        handleFormChange("badge", e.target.value)
                      }
                      placeholder="Recommended, High value…"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>
              </section>

              {/* Targeting */}
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Targeting
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      GEO allow (comma separated)
                    </label>
                    <input
                      value={form.geoAllow}
                      onChange={(e) =>
                        handleFormChange("geoAllow", e.target.value)
                      }
                      placeholder="US,CA,GB"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      GEO deny (comma separated)
                    </label>
                    <input
                      value={form.geoDeny}
                      onChange={(e) =>
                        handleFormChange("geoDeny", e.target.value)
                      }
                      placeholder="RU,CN"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Device target
                    </label>
                    <select
                      value={form.deviceTarget}
                      onChange={(e) =>
                        handleFormChange(
                          "deviceTarget",
                          e.target.value as DeviceTarget
                        )
                      }
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    >
                      <option value="all">Desktop + Mobile</option>
                      <option value="desktop">Desktop only</option>
                      <option value="mobile">Mobile only</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Platforms
                    </label>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                      {(["web", "android", "ios"] as PlatformTarget[]).map(
                        (p) => {
                          const active = form.platforms.includes(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                handleFormChange(
                                  "platforms",
                                  active
                                    ? form.platforms.filter((x) => x !== p)
                                    : [...form.platforms, p]
                                );
                              }}
                              className={`rounded-full border px-2 py-0.5 ${
                                active
                                  ? "border-cyan-400 bg-cyan-500/20"
                                  : "border-slate-700 bg-slate-900"
                              }`}
                            >
                              {p}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Placement IDs (comma separated) – leave blank for all
                  </label>
                  <input
                    value={form.placementIds}
                    onChange={(e) =>
                      handleFormChange("placementIds", e.target.value)
                    }
                    placeholder="ObjectId1,ObjectId2"
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Daily cap (conversions) – optional
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.dailyCap}
                    onChange={(e) =>
                      handleFormChange("dailyCap", e.target.value)
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </section>


              {/* Presentation & status */}
              <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Presentation
                </h3>
                <div className="grid grid-cols-[2fr_minmax(0,1fr)] gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Image URL
                    </label>
                    <input
                      value={form.imageUrl}
                      onChange={(e) =>
                        handleFormChange("imageUrl", e.target.value)
                      }
                      placeholder="https://…"
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    {form.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.imageUrl}
                        alt="Preview"
                        className="h-12 w-full max-w-[72px] rounded-md object-cover"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      handleFormChange("status", e.target.value as OfferStatus)
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </section>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-full border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.65)] transition hover:bg-cyan-400 disabled:opacity-60"
                >
                  {saving
                    ? form.id
                      ? "Saving…"
                      : "Creating…"
                    : form.id
                    ? "Save changes"
                    : "Create offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Outer component – wraps inner in SessionProvider                    */
/* ------------------------------------------------------------------ */

export default function AdminOffersPage() {
  return (
    <SessionProvider>
      <AdminOffersInner />
    </SessionProvider>
  );
}
