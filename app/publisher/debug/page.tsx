// app/publisher/debug/page.tsx
"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";

type RangeKey = "today" | "7d" | "30d" | "all";

type StatsResponse = {
  range: RangeKey;
  totals: {
    clicks: number;
    conversions: number;
    epc: number;
    advertiserRevenueUsd: number;
    publisherEarningsUsd: number;
  };
  wallet: {
    balanceCents: number;
    balanceUsd: number;
  };
};

type ClickItem = {
  id: string;
  clickId: string;
  offerId: string;
  subId: string | null;
  createdAt: string;
  ip: string | null;
  userAgent: string | null;
};

type ConversionItem = {
  id: string;
  clickId: string;
  offerId: string;
  advertiserPayoutUsd: number;
  publisherPayoutUsd: number;
  status: string;
  createdAt: string;
};

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export default function PublisherDebugPage() {
  const [publisherId, setPublisherId] = useState("");
  const [range, setRange] = useState<RangeKey>("7d");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [clicks, setClicks] = useState<ClickItem[]>([]);
  const [conversions, setConversions] = useState<ConversionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canLoad = publisherId.trim().length > 0;

  async function loadAll() {
    if (!canLoad) return;
    setLoading(true);
    setError(null);

    try {
      const base = `/api/publisher`;
      const qsStats = `publisherId=${encodeURIComponent(
        publisherId.trim()
      )}&range=${range}`;
      const qsList = `publisherId=${encodeURIComponent(
        publisherId.trim()
      )}&limit=25`;

      const [statsRes, clicksRes, convsRes] = await Promise.all([
        fetch(`${base}/stats?${qsStats}`),
        fetch(`${base}/recent-clicks?${qsList}`),
        fetch(`${base}/recent-conversions?${qsList}`),
      ]);

      if (!statsRes.ok) {
        const body = await statsRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load stats");
      }

      if (!clicksRes.ok) {
        const body = await clicksRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load recent clicks");
      }

      if (!convsRes.ok) {
        const body = await convsRes.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load conversions");
      }

      const statsJson = (await statsRes.json()) as StatsResponse;
      const clicksJson = (await clicksRes.json()) as { items: ClickItem[] };
      const convsJson = (await convsRes.json()) as {
        items: ConversionItem[];
      };

      setStats(statsJson);
      setClicks(clicksJson.items);
      setConversions(convsJson.items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  // Optional: auto-load if you hardcode a default publisherId
  // useEffect(() => {
  //   if (publisherId) loadAll();
  // }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-2">
          Publisher Debug Dashboard
        </h1>
        <p className="text-slate-400 mb-6">
          Paste a <span className="font-mono">publisherId</span> from MongoDB
          to inspect live clicks, conversions, and wallet stats.
        </p>

        {/* Controls */}
        <div className="mb-8 grid gap-4 md:grid-cols-[2fr,1fr,auto] items-end">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Publisher ID
            </label>
            <input
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. 691ce1081e594c876e094b02"
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Range
            </label>
            <div className="flex flex-wrap gap-2">
              {RANGE_LABELS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    range === r.key
                      ? "bg-blue-600 border-blue-500 text-white shadow"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!canLoad || loading}
            onClick={loadAll}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold shadow-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading…" : "Load data"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-500/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Stats cards */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-4 mb-10">
            <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Clicks
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {stats.totals.clicks}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Conversions
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {stats.totals.conversions}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                EPC
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatMoney(stats.totals.epc)}
              </p>
            </div>

            <div className="rounded-xl border border-blue-500/40 bg-gradient-to-br from-blue-900/30 to-slate-950 p-4 shadow">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Wallet Balance
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatMoney(stats.wallet.balanceUsd)}
              </p>
            </div>
          </div>
        )}

        {/* Recent conversions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Recent Conversions</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Offer</th>
                  <th className="px-3 py-2">Click ID</th>
                  <th className="px-3 py-2">Payout (Adv)</th>
                  <th className="px-3 py-2">Payout (Pub)</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {conversions.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-4 text-center text-slate-500"
                      colSpan={6}
                    >
                      No conversions yet.
                    </td>
                  </tr>
                ) : (
                  conversions.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-slate-800/80 hover:bg-slate-900/40"
                    >
                      <td className="px-3 py-2 text-slate-200">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-slate-300 font-mono text-xs">
                        {c.offerId}
                      </td>
                      <td className="px-3 py-2 text-slate-300 font-mono text-xs">
                        {c.clickId}
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {formatMoney(c.advertiserPayoutUsd)}
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {formatMoney(c.publisherPayoutUsd)}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${
                            c.status === "approved"
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
                              : c.status === "pending"
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/40"
                              : "bg-red-500/15 text-red-300 border border-red-500/40"
                          }`}
                        >
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent clicks */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Recent Clicks</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-slate-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Offer</th>
                  <th className="px-3 py-2">Click ID</th>
                  <th className="px-3 py-2">SubID</th>
                  <th className="px-3 py-2">IP</th>
                  <th className="px-3 py-2">User Agent</th>
                </tr>
              </thead>
              <tbody>
                {clicks.length === 0 ? (
                  <tr>
                    <td
                      className="px-3 py-4 text-center text-slate-500"
                      colSpan={6}
                    >
                      No clicks yet.
                    </td>
                  </tr>
                ) : (
                  clicks.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-slate-800/80 hover:bg-slate-900/40"
                    >
                      <td className="px-3 py-2 text-slate-200">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-slate-300 font-mono text-xs">
                        {c.offerId}
                      </td>
                      <td className="px-3 py-2 text-slate-300 font-mono text-xs">
                        {c.clickId}
                      </td>
                      <td className="px-3 py-2 text-slate-300 font-mono text-xs">
                        {c.subId || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs">
                        {c.ip || "-"}
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-[11px]">
                        {c.userAgent || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Debug-only view. In the real publisher dashboard, this will be tied to
          authenticated accounts instead of manual IDs.
        </p>
      </div>
    </div>
  );
}
