"use client";

import React, { useState } from "react";
import { Download, Search, Check, Loader2, RefreshCw, PackagePlus } from "lucide-react";

type NetworkOffer = {
  externalOfferId: string;
  name: string;
  title: string;
  description: string;
  redirectUrl: string;
  payoutUsd: number;
  category: string | null;
  imageUrl: string | null;
  estimatedMinutes: number | null;
  geoAllow: string[];
  deviceTarget: "all" | "desktop" | "mobile";
  platforms: string[];
  dailyCap: number | null;
  alreadyImported: boolean;
  importedStatus: string | null;
};

const NETWORKS = [
  { id: "adtowall", label: "AdToWall" },
];

export default function ImportOffersPage() {
  const [network, setNetwork] = useState("adtowall");
  const [offers, setOffers] = useState<NetworkOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; errors: number } | null>(null);

  /* ─── Fetch from network ─── */
  async function fetchOffers() {
    setLoading(true);
    setFetchError(null);
    setOffers([]);
    setSelected(new Set());
    setImportResult(null);
    setFetched(false);

    try {
      const res = await fetch(`/api/admin/network-offers?network=${network}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed to fetch offers");
      setOffers(data.offers ?? []);
      setFetched(true);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ─── Selection helpers ─── */
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = offers.filter((o) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.name.toLowerCase().includes(q) ||
      (o.category ?? "").toLowerCase().includes(q) ||
      o.geoAllow.some((g) => g.toLowerCase().includes(q))
    );
  });

  function selectAll() {
    setSelected(new Set(filtered.map((o) => o.externalOfferId)));
  }
  function selectNone() {
    setSelected(new Set());
  }
  function selectNew() {
    setSelected(new Set(filtered.filter((o) => !o.alreadyImported).map((o) => o.externalOfferId)));
  }

  /* ─── Import selected ─── */
  async function importSelected() {
    if (selected.size === 0) return;
    setImporting(true);
    setImportResult(null);

    const toImport = offers.filter((o) => selected.has(o.externalOfferId));

    try {
      const res = await fetch("/api/admin/network-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network, offers: toImport }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Import failed");
      setImportResult({ inserted: data.inserted, updated: data.updated, errors: data.errors });
      // Re-fetch to update alreadyImported flags
      await fetchOffers();
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl text-white pb-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <PackagePlus className="h-6 w-6 text-cyan-400" />
            Import Offers
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Browse offers from your network publisher account and select which ones to add to RewardsRiver.
          </p>
        </div>
        <a href="/admin/offers" className="text-xs text-gray-400 hover:text-gray-200">
          ← Back to Offers
        </a>
      </div>

      {/* Controls */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-slate-950/80 p-4">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Network</label>
          <select
            value={network}
            onChange={(e) => { setNetwork(e.target.value); setFetched(false); setOffers([]); }}
            className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            {NETWORKS.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchOffers}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {fetched ? "Refresh" : "Fetch Offers"}
        </button>

        {fetched && (
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span>{offers.length} offers found</span>
            <span>·</span>
            <span>{offers.filter((o) => o.alreadyImported).length} already imported</span>
          </div>
        )}
      </div>

      {/* Error */}
      {fetchError && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {fetchError}
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Import complete — {importResult.inserted} added, {importResult.updated} updated
          {importResult.errors > 0 && `, ${importResult.errors} errors`}.
        </div>
      )}

      {/* Offer list */}
      {fetched && offers.length > 0 && (
        <>
          {/* Search + bulk select bar */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Filter by name, category, GEO…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900 py-2 pl-8 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button type="button" onClick={selectNew} className="rounded border border-white/10 bg-slate-800 px-3 py-1.5 text-gray-300 hover:bg-slate-700">
                Select new
              </button>
              <button type="button" onClick={selectAll} className="rounded border border-white/10 bg-slate-800 px-3 py-1.5 text-gray-300 hover:bg-slate-700">
                Select all
              </button>
              <button type="button" onClick={selectNone} className="rounded border border-white/10 bg-slate-800 px-3 py-1.5 text-gray-300 hover:bg-slate-700">
                Clear
              </button>
            </div>

            <button
              type="button"
              onClick={importSelected}
              disabled={selected.size === 0 || importing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Import {selected.size > 0 ? `${selected.size} selected` : "selected"}
            </button>
          </div>

          {/* Offer grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((offer) => {
              const isSelected = selected.has(offer.externalOfferId);
              return (
                <button
                  key={offer.externalOfferId}
                  type="button"
                  onClick={() => toggle(offer.externalOfferId)}
                  className={`relative flex flex-col gap-2 rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-cyan-500/60 bg-cyan-500/10 ring-1 ring-cyan-500/40"
                      : "border-white/10 bg-slate-900/60 hover:border-white/20 hover:bg-slate-900"
                  }`}
                >
                  {/* Selection indicator */}
                  <div className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border transition ${
                    isSelected ? "border-cyan-400 bg-cyan-500" : "border-white/20 bg-slate-800"
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>

                  {/* Already imported badge */}
                  {offer.alreadyImported && (
                    <span className="absolute left-3 top-3 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      In library
                    </span>
                  )}

                  {/* Image */}
                  {offer.imageUrl && (
                    <div className="mt-4 h-20 w-full overflow-hidden rounded-lg bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={offer.imageUrl}
                        alt={offer.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}

                  {/* Name + payout */}
                  <div className={offer.imageUrl ? "" : "mt-5"}>
                    <p className="text-sm font-medium leading-tight text-white">{offer.name}</p>
                    <p className="mt-1 text-lg font-semibold text-emerald-400">
                      ${offer.payoutUsd.toFixed(2)}
                      <span className="ml-1 text-xs font-normal text-gray-400">/ conversion</span>
                    </p>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    {offer.category && (
                      <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-blue-300">
                        {offer.category}
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 ${
                      offer.deviceTarget === "mobile" ? "bg-purple-500/15 text-purple-300" :
                      offer.deviceTarget === "desktop" ? "bg-slate-700 text-gray-300" :
                      "bg-slate-700 text-gray-300"
                    }`}>
                      {offer.deviceTarget === "all" ? "All devices" : offer.deviceTarget}
                    </span>
                    {offer.estimatedMinutes && (
                      <span className="rounded-full bg-slate-700 px-2 py-0.5 text-gray-300">
                        ~{offer.estimatedMinutes}m
                      </span>
                    )}
                  </div>

                  {/* GEO */}
                  {offer.geoAllow.length > 0 && (
                    <p className="text-[10px] text-gray-500">
                      GEO: {offer.geoAllow.slice(0, 6).join(", ")}
                      {offer.geoAllow.length > 6 && ` +${offer.geoAllow.length - 6} more`}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-500">No offers match your filter.</div>
          )}
        </>
      )}

      {fetched && offers.length === 0 && !loading && (
        <div className="py-10 text-center text-sm text-gray-500">
          No offers returned from {network}. Check your API credentials in Vercel env vars.
        </div>
      )}

      {!fetched && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center text-sm text-gray-500">
          <PackagePlus className="mb-3 h-8 w-8 text-gray-600" />
          Select a network above and click <strong className="text-gray-300 ml-1">Fetch Offers</strong> to browse.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="ml-3 text-sm text-gray-400">Fetching offers from {network}…</span>
        </div>
      )}
    </div>
  );
}
