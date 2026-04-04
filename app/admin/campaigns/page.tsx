// app/admin/campaigns/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  category: string | null;
  status: string;
  advertiser: { id: string | null; companyName: string; contactEmail: string | null };
  payoutPerConversionUsd: number;
  publisherPayoutUsd: number;
  totalBudgetUsd: number | null;
  geoAllow: string[];
  deviceTarget: string;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending_review: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  archived: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  draft: "bg-slate-600/15 text-slate-400 border-slate-600/30",
};

const FILTERS = ["pending_review", "active", "paused", "archived"];

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [status, setStatus] = useState("pending_review");
  const [loading, setLoading] = useState(true);

  const load = async (s: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/campaigns?status=${s}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setCampaigns(data.campaigns);
    setLoading(false);
  };

  useEffect(() => { load(status); }, [status]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Campaigns</h1>
        <p className="mt-1 text-sm text-slate-400">Review and approve advertiser campaigns.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              status === f
                ? "border-cyan-400/80 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-slate-900/70 text-gray-300 hover:border-cyan-400/50"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-400">
          No campaigns with status &quot;{status.replace("_", " ")}&quot;.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/80">
          <div className="hidden grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] gap-4 border-b border-white/5 bg-slate-900/80 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
            <span>Campaign</span>
            <span>Advertiser</span>
            <span>Status</span>
            <span>Payout</span>
            <span>Budget</span>
            <span />
          </div>
          <div className="divide-y divide-white/5">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-slate-900/30 sm:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <div>
                  <Link href={`/admin/campaigns/${c.id}`} className="text-sm font-medium text-slate-100 hover:text-cyan-300 transition">
                    {c.name}
                  </Link>
                  {c.category && <p className="text-[11px] text-gray-500">{c.category}</p>}
                </div>
                <div className="text-sm text-gray-300">
                  {c.advertiser.companyName}
                  {c.advertiser.contactEmail && (
                    <p className="text-[11px] text-gray-500">{c.advertiser.contactEmail}</p>
                  )}
                </div>
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[c.status] ?? STATUS_BADGE.archived}`}>
                  {c.status.replace("_", " ")}
                </span>
                <div className="text-xs text-gray-300">
                  <span className="text-gray-500">Adv: </span>${c.payoutPerConversionUsd.toFixed(2)}
                  <br />
                  <span className="text-gray-500">Pub: </span>${c.publisherPayoutUsd.toFixed(2)}
                </div>
                <div className="text-sm text-gray-300">
                  {c.totalBudgetUsd ? `$${c.totalBudgetUsd.toFixed(0)}` : "Unlimited"}
                </div>
                <Link
                  href={`/admin/campaigns/${c.id}`}
                  className="rounded-lg border border-white/10 bg-slate-900 p-1.5 text-gray-400 hover:text-cyan-300 hover:border-cyan-400/40 transition"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
