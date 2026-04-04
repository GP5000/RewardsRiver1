// app/admin/advertisers/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AdvertiserDetail = {
  id: string;
  companyName: string;
  contactEmail: string | null;
  websiteUrl: string | null;
  postbackUrl: string | null;
  status: string;
  apiKeySuffix: string | null;
  createdAt: string;
  user: { id: string | null; name: string | null; email: string | null; createdAt: string } | null;
  wallet: { balanceCents: number; balanceUsd: number };
  campaigns: {
    id: string;
    name: string;
    status: string;
    payoutPerConversionUsd: number;
    totalBudgetUsd: number | null;
    spentTotalUsd: number;
    statsConversions: number;
    createdAt: string;
  }[];
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  suspended: "bg-red-500/15 text-red-300 border-red-500/30",
};

const CAMPAIGN_BADGE: Record<string, string> = {
  active: "text-emerald-300",
  paused: "text-amber-300",
  pending_review: "text-sky-300",
  archived: "text-slate-400",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 last:border-0">
      <span className="w-40 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-200 break-all">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminAdvertiserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [advertiser, setAdvertiser] = useState<AdvertiserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/admin/advertisers/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setAdvertiser(data.advertiser);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string) => {
    setActioning(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/admin/advertisers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setActioning(false);
    if (!data.ok) { setError(data.error); return; }
    setSuccess(`Advertiser ${action}d.`);
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" /></div>;
  }

  if (!advertiser) {
    return <div className="text-sm text-slate-400">Advertiser not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/advertisers" className="text-slate-500 hover:text-cyan-300 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">{advertiser.companyName}</h1>
          <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[advertiser.status] ?? STATUS_BADGE.pending}`}>
            {advertiser.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {advertiser.status === "pending" && (
            <button onClick={() => doAction("approve")} disabled={actioning} className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition">
              Approve
            </button>
          )}
          {advertiser.status !== "suspended" && (
            <button onClick={() => doAction("suspend")} disabled={actioning} className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition">
              Suspend
            </button>
          )}
          {advertiser.status === "suspended" && (
            <button onClick={() => doAction("reinstate")} disabled={actioning} className="inline-flex items-center gap-1 rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition">
              Reinstate
            </button>
          )}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">{error}</div>}
      {success && <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 border border-emerald-500/40">{success}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-sky-500/20 bg-slate-950 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-sky-400/70">Wallet balance</p>
          <p className="mt-1 text-2xl font-semibold text-white">${advertiser.wallet.balanceUsd.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-slate-950 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Campaigns</p>
          <p className="mt-1 text-2xl font-semibold text-white">{advertiser.campaigns.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Profile</h2>
        <Row label="Contact email" value={advertiser.contactEmail} />
        <Row label="Website" value={advertiser.websiteUrl} />
        <Row label="Postback URL" value={advertiser.postbackUrl} />
        <Row label="API key" value={advertiser.apiKeySuffix ? `…${advertiser.apiKeySuffix}` : "Not set"} />
        <Row label="User" value={advertiser.user?.email ?? "—"} />
        <Row label="Joined" value={new Date(advertiser.createdAt).toLocaleString()} />
      </div>

      {advertiser.campaigns.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
          <div className="border-b border-white/5 bg-slate-900/80 px-5 py-3">
            <h2 className="text-sm font-semibold text-white">Campaigns</h2>
          </div>
          <div className="divide-y divide-white/5 text-sm">
            {advertiser.campaigns.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-900/30">
                <div>
                  <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-slate-100 hover:text-cyan-300 transition">{c.name}</Link>
                  <p className={`text-[11px] capitalize ${CAMPAIGN_BADGE[c.status] ?? "text-gray-400"}`}>{c.status.replace("_", " ")}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>Spent: ${c.spentTotalUsd.toFixed(2)}{c.totalBudgetUsd ? ` / $${c.totalBudgetUsd.toFixed(0)}` : ""}</p>
                  <p>{c.statsConversions} conversions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
