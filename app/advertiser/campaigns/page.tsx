"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pause, Play, ArrowRight } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  status: string;
  payoutPerConversionUsd: number;
  publisherPayoutUsd: number;
  totalBudgetUsd: number | null;
  spentTotalUsd: number;
  statsConversions: number;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending_review: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  archived: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  draft: "bg-slate-600/15 text-slate-400 border-slate-600/30",
};

const FILTERS = ["all", "active", "paused", "pending_review", "archived", "draft"];

export default function AdvertiserCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);

  const load = async (status: string) => {
    setLoading(true);
    const qs = status !== "all" ? `?status=${status}` : "";
    const res = await fetch(`/api/advertiser/campaigns${qs}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setCampaigns(data.campaigns);
    setLoading(false);
  };

  useEffect(() => { load(filter); }, [filter]);

  const doAction = async (id: string, action: "pause" | "resume") => {
    setActioning(id);
    await fetch(`/api/advertiser/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setActioning(null);
    load(filter);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
          <p className="mt-1 text-sm text-gray-400">Manage your ad campaigns.</p>
        </div>
        <Link
          href="/advertiser/campaigns/new"
          className="inline-flex items-center gap-2 rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              filter === f
                ? "border-sky-400/80 bg-sky-400/10 text-sky-100"
                : "border-white/10 bg-slate-900/70 text-gray-300 hover:border-sky-400/50"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <p className="text-sm text-gray-400">No campaigns found.</p>
          <Link
            href="/advertiser/campaigns/new"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-sky-500/50 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
          >
            <Plus className="h-4 w-4" /> Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/80">
          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-white/5 bg-slate-900/80 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
            <span>Campaign</span>
            <span>Status</span>
            <span>Payout</span>
            <span>Spend</span>
            <span>Conversions</span>
            <span />
          </div>

          <div className="divide-y divide-white/5">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition hover:bg-slate-900/30 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <div>
                  <Link
                    href={`/advertiser/campaigns/${c.id}`}
                    className="text-sm font-medium text-gray-100 hover:text-sky-300 transition"
                  >
                    {c.name}
                  </Link>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Created {new Date(c.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <span
                  className={`inline-block self-start rounded-full border px-2.5 py-0.5 text-[11px] font-medium sm:self-auto ${STATUS_BADGE[c.status] ?? STATUS_BADGE.archived}`}
                >
                  {c.status.replace("_", " ")}
                </span>

                <div className="text-xs text-gray-300">
                  <span className="text-gray-400">Adv: </span>${c.payoutPerConversionUsd.toFixed(2)}
                  <br />
                  <span className="text-gray-400">Pub: </span>${c.publisherPayoutUsd.toFixed(2)}
                </div>

                <div className="text-xs text-gray-300">
                  ${c.spentTotalUsd.toFixed(2)}
                  {c.totalBudgetUsd && (
                    <span className="text-gray-500"> / ${c.totalBudgetUsd.toFixed(2)}</span>
                  )}
                </div>

                <div className="text-sm text-gray-200">{c.statsConversions}</div>

                <div className="flex items-center gap-2">
                  {c.status === "active" && (
                    <button
                      onClick={() => doAction(c.id, "pause")}
                      disabled={actioning === c.id}
                      title="Pause"
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-1.5 text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition"
                    >
                      <Pause className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {c.status === "paused" && (
                    <button
                      onClick={() => doAction(c.id, "resume")}
                      disabled={actioning === c.id}
                      title="Resume"
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition"
                    >
                      <Play className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Link
                    href={`/advertiser/campaigns/${c.id}`}
                    className="rounded-lg border border-white/10 bg-slate-900 p-1.5 text-gray-400 hover:text-sky-300 hover:border-sky-400/40 transition"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
