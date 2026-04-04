// app/admin/campaigns/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  trackingUrl: string;
  postbackUrl: string | null;
  payoutPerConversionUsd: number;
  publisherPayoutUsd: number;
  totalBudgetUsd: number | null;
  geoAllow: string[];
  geoDeny: string[];
  deviceTarget: string;
  platforms: string[];
  imageUrl: string | null;
  attributionWindowDays: number;
  statsClicks: number;
  statsConversions: number;
  createdAt: string;
  advertiser: {
    id: string | null;
    companyName: string;
    contactEmail: string | null;
    websiteUrl: string | null;
  };
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  paused: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  pending_review: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  archived: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-start sm:justify-between border-b border-white/5 last:border-0">
      <span className="w-40 shrink-0 text-xs text-slate-500">{label}</span>
      <span className="text-sm text-slate-200 break-all">{value ?? "—"}</span>
    </div>
  );
}

export default function AdminCampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch(`/api/admin/campaigns/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setCampaign(data.campaign);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: "approve" | "reject") => {
    if (action === "reject" && !confirm("Reject this campaign? It will be archived.")) return;
    setActioning(true);
    setError(null);
    setSuccess(null);
    const res = await fetch(`/api/admin/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setActioning(false);
    if (!data.ok) { setError(data.error); return; }
    setSuccess(action === "approve" ? "Campaign approved and activated." : "Campaign rejected and archived.");
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" /></div>;
  }

  if (!campaign) {
    return <div className="text-sm text-slate-400">Campaign not found.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/campaigns" className="text-slate-500 hover:text-cyan-300 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">{campaign.name}</h1>
          <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[campaign.status] ?? STATUS_BADGE.archived}`}>
            {campaign.status.replace("_", " ")}
          </span>
        </div>

        {campaign.status === "pending_review" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => doAction("approve")}
              disabled={actioning}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve
            </button>
            <button
              onClick={() => doAction("reject")}
              disabled={actioning}
              className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition"
            >
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        )}
      </div>

      {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">{error}</div>}
      {success && <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 border border-emerald-500/40">{success}</div>}

      {/* Advertiser */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Advertiser</h2>
        <Row label="Company" value={campaign.advertiser.companyName} />
        <Row label="Email" value={campaign.advertiser.contactEmail} />
        <Row label="Website" value={campaign.advertiser.websiteUrl} />
        {campaign.advertiser.id && (
          <div className="mt-3">
            <Link href={`/admin/advertisers/${campaign.advertiser.id}`} className="text-xs text-cyan-400 hover:text-cyan-300">
              View advertiser profile →
            </Link>
          </div>
        )}
      </div>

      {/* Campaign details */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Campaign details</h2>
        <Row label="Category" value={campaign.category} />
        <Row label="Description" value={campaign.description} />
        <Row label="Tracking URL" value={<span className="font-mono text-xs text-sky-300">{campaign.trackingUrl}</span>} />
        <Row label="Postback URL" value={campaign.postbackUrl ? <span className="font-mono text-xs text-sky-300">{campaign.postbackUrl}</span> : null} />
        <Row label="Adv payout" value={`$${campaign.payoutPerConversionUsd.toFixed(2)}`} />
        <Row label="Pub payout" value={`$${campaign.publisherPayoutUsd.toFixed(2)}`} />
        <Row label="Total budget" value={campaign.totalBudgetUsd ? `$${campaign.totalBudgetUsd.toFixed(2)}` : "Unlimited"} />
        <Row label="Geo allow" value={campaign.geoAllow.length > 0 ? campaign.geoAllow.join(", ") : "All"} />
        <Row label="Geo deny" value={campaign.geoDeny.length > 0 ? campaign.geoDeny.join(", ") : "None"} />
        <Row label="Device target" value={campaign.deviceTarget} />
        <Row label="Platforms" value={campaign.platforms.join(", ")} />
        <Row label="Attribution window" value={`${campaign.attributionWindowDays} days`} />
        <Row label="Created" value={new Date(campaign.createdAt).toLocaleString()} />
      </div>

      {campaign.imageUrl && (
        <div className="rounded-2xl border border-white/10 overflow-hidden max-w-sm aspect-video bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.imageUrl} alt="Creative" className="w-full h-full object-cover" />
        </div>
      )}
    </div>
  );
}
