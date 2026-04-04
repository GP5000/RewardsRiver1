"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pause, Play, Send } from "lucide-react";

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
  dailyBudgetUsd?: number | null;
  spentTotalUsd?: number;
  geoAllow: string[];
  geoDeny: string[];
  deviceTarget: string;
  platforms: string[];
  imageUrl: string | null;
  attributionWindowDays: number;
  postbackSecretSuffix: string | null;
  statsClicks: number;
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

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm text-gray-200">{value}</span>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/advertiser/campaigns/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) { setError(data.error); setLoading(false); return; }
    setCampaign(data.campaign);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: "pause" | "resume") => {
    setActioning(true);
    const res = await fetch(`/api/advertiser/campaigns/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setActioning(false);
    if (!data.ok) { setError(data.error); return; }
    load();
  };

  const testPostback = async () => {
    setTestLoading(true);
    setTestResult(null);
    const res = await fetch(`/api/advertiser/campaigns/${id}/test-postback`, { method: "POST" });
    const data = await res.json();
    setTestLoading(false);
    setTestResult(data.ok ? `Success: ${data.message ?? "Postback fired."}` : `Error: ${data.error}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">
        {error || "Campaign not found."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex items-center gap-3">
        <Link href="/advertiser/campaigns" className="text-gray-500 hover:text-sky-300 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-white">{campaign.name}</h1>
          <span
            className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[campaign.status] ?? STATUS_BADGE.archived}`}
          >
            {campaign.status.replace("_", " ")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === "active" && (
            <button
              onClick={() => doAction("pause")}
              disabled={actioning}
              className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20 disabled:opacity-50 transition"
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={() => doAction("resume")}
              disabled={actioning}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition"
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Clicks", value: campaign.statsClicks },
          { label: "Conversions", value: campaign.statsConversions },
          { label: "Payout / conv", value: `$${campaign.payoutPerConversionUsd.toFixed(2)}` },
          { label: "Publisher payout", value: `$${campaign.publisherPayoutUsd.toFixed(2)}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-slate-900/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">{label}</p>
            <p className="mt-1 text-xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Creative preview */}
      {campaign.imageUrl && (
        <div className="rounded-2xl border border-white/10 overflow-hidden max-w-sm aspect-video bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={campaign.imageUrl} alt="Creative" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Details */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Campaign details</h2>
        <Row label="Category" value={campaign.category ?? "—"} />
        <Row label="Description" value={campaign.description ?? "—"} />
        <Row
          label="Tracking URL"
          value={<span className="font-mono text-xs text-sky-300 break-all">{campaign.trackingUrl}</span>}
        />
        <Row
          label="Postback URL"
          value={campaign.postbackUrl
            ? <span className="font-mono text-xs text-sky-300 break-all">{campaign.postbackUrl}</span>
            : "—"
          }
        />
        <Row
          label="Postback secret"
          value={campaign.postbackSecretSuffix ? `…${campaign.postbackSecretSuffix}` : "—"}
        />
        <Row label="Total budget" value={campaign.totalBudgetUsd ? `$${campaign.totalBudgetUsd.toFixed(2)}` : "Unlimited"} />
        <Row label="Geo allow" value={campaign.geoAllow.length > 0 ? campaign.geoAllow.join(", ") : "All"} />
        <Row label="Geo deny" value={campaign.geoDeny.length > 0 ? campaign.geoDeny.join(", ") : "None"} />
        <Row label="Device target" value={campaign.deviceTarget} />
        <Row label="Platforms" value={campaign.platforms.join(", ")} />
        <Row label="Attribution window" value={`${campaign.attributionWindowDays} days`} />
        <Row label="Created" value={new Date(campaign.createdAt).toLocaleString()} />
      </div>

      {/* Test postback */}
      {campaign.postbackUrl && (
        <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5">
          <h2 className="mb-1 text-sm font-semibold text-white">Test postback</h2>
          <p className="mb-3 text-xs text-gray-400">
            Fires a test request to your postback URL to verify your integration.
          </p>
          <button
            onClick={testPostback}
            disabled={testLoading}
            className="inline-flex items-center gap-2 rounded-full border border-sky-500/40 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
            {testLoading ? "Sending…" : "Send test postback"}
          </button>
          {testResult && (
            <div
              className={`mt-3 rounded-md px-3 py-2 text-xs border ${
                testResult.startsWith("Success")
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-red-500/10 text-red-300 border-red-500/30"
              }`}
            >
              {testResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
