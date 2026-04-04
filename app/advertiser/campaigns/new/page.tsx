"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

/* ─── Step data shape ─── */
type FormData = {
  // Step 1 – Info
  name: string;
  description: string;
  category: string;
  // Step 2 – Creative
  imageUrl: string;
  // Step 3 – Tracking
  trackingUrl: string;
  postbackUrl: string;
  // Step 4 – Payout & Budget
  payoutPerConversionUsd: string;
  dailyBudgetUsd: string;
  totalBudgetUsd: string;
  dailyCap: string;
  spendAlertThreshold: string;
  // Step 5 – Targeting
  geoAllow: string;
  geoDeny: string;
  deviceTarget: string;
  platforms: string[];
  attributionWindowDays: string;
  startDate: string;
  endDate: string;
};

const INITIAL: FormData = {
  name: "", description: "", category: "",
  imageUrl: "",
  trackingUrl: "", postbackUrl: "",
  payoutPerConversionUsd: "", dailyBudgetUsd: "", totalBudgetUsd: "", dailyCap: "",
  spendAlertThreshold: "80",
  geoAllow: "", geoDeny: "", deviceTarget: "all",
  platforms: ["web"], attributionWindowDays: "30",
  startDate: "", endDate: "",
};

const CATEGORIES = [
  "Gaming", "Finance", "Health & Beauty", "Dating", "Software", "Education",
  "Shopping", "Travel", "Crypto", "Survey", "App Install", "Other",
];

const STEPS = ["Info", "Creative", "Tracking", "Budget", "Targeting"];

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-300 mb-1">{children}</label>;
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 placeholder:text-gray-600 ${className}`}
    />
  );
}

function Textarea({ className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 placeholder:text-gray-600 resize-none ${className}`}
    />
  );
}

function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 ${className}`}
    />
  );
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [postbackSecret, setPostbackSecret] = useState<string | null>(null);

  const set = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const togglePlatform = (p: string) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(p)
        ? f.platforms.filter((x) => x !== p)
        : [...f.platforms, p],
    }));

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 2) return form.trackingUrl.startsWith("https://");
    if (step === 3) return parseFloat(form.payoutPerConversionUsd) > 0;
    return true;
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    const body = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      trackingUrl: form.trackingUrl.trim(),
      postbackUrl: form.postbackUrl.trim() || undefined,
      payoutPerConversionUsd: parseFloat(form.payoutPerConversionUsd),
      dailyBudgetUsd: form.dailyBudgetUsd ? parseFloat(form.dailyBudgetUsd) : undefined,
      totalBudgetUsd: form.totalBudgetUsd ? parseFloat(form.totalBudgetUsd) : undefined,
      dailyCap: form.dailyCap ? parseInt(form.dailyCap) : undefined,
      spendAlertThreshold: form.spendAlertThreshold ? parseInt(form.spendAlertThreshold) : undefined,
      geoAllow: form.geoAllow ? form.geoAllow.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
      geoDeny: form.geoDeny ? form.geoDeny.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : [],
      deviceTarget: form.deviceTarget,
      platforms: form.platforms,
      attributionWindowDays: parseInt(form.attributionWindowDays) || 30,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };

    const res = await fetch("/api/advertiser/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!data.ok) {
      setError(data.error || "Failed to create campaign.");
      return;
    }

    setPostbackSecret(data.postbackSecret ?? null);
  };

  if (postbackSecret !== null) {
    return (
      <div className="mx-auto max-w-lg pt-10">
        <div className="rounded-2xl border border-emerald-500/30 bg-slate-950 px-7 py-7 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-400" />
          <h2 className="text-lg font-semibold text-white">Campaign submitted!</h2>
          <p className="mt-2 text-sm text-gray-400">
            Your campaign is pending admin review. Save your postback secret — it will only appear once.
          </p>
          {postbackSecret && (
            <div className="mt-4 rounded-lg border border-sky-500/30 bg-slate-900 px-4 py-3 font-mono text-sm text-sky-300 break-all text-left">
              <p className="text-[10px] text-gray-500 mb-1">Postback secret</p>
              {postbackSecret}
            </div>
          )}
          <button
            onClick={() => router.push("/advertiser/campaigns")}
            className="mt-5 inline-block rounded-md bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            View campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                i < step
                  ? "bg-sky-500 text-slate-950"
                  : i === step
                  ? "border-2 border-sky-400 bg-sky-400/10 text-sky-300"
                  : "border border-white/10 bg-slate-900 text-gray-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`hidden text-xs sm:inline ${
                i === step ? "text-sky-300" : i < step ? "text-gray-300" : "text-gray-500"
              }`}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-4 w-4 text-gray-600 mx-1" />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-6 py-6">
        <h2 className="mb-5 text-base font-semibold text-white">
          Step {step + 1}: {STEPS[step]}
        </h2>

        {/* Step 0 – Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <Label>Campaign name *</Label>
              <Input value={form.name} onChange={set("name")} placeholder="e.g. Summer App Install Push" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={set("description")} rows={3} placeholder="Brief description of your offer…" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onChange={set("category")}>
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
        )}

        {/* Step 1 – Creative */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Creative image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={set("imageUrl")}
                placeholder="https://cdn.example.com/creative-16x9.jpg"
                type="url"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Recommended: 1280×720 (16:9). Accepted: JPEG, PNG, WebP.
              </p>
            </div>
            {form.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-slate-900 max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Step 2 – Tracking */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Tracking URL * (must be HTTPS)</Label>
              <Input
                value={form.trackingUrl}
                onChange={set("trackingUrl")}
                placeholder="https://tracking.yournetwork.com/click?offer=123&pub={pub}&uid={uid}"
                type="url"
                required
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Macros available: <code className="text-sky-400">{"{pub}"}</code>, <code className="text-sky-400">{"{uid}"}</code>, <code className="text-sky-400">{"{click_id}"}</code>
              </p>
            </div>
            <div>
              <Label>Postback URL (for advertiser-side conversion tracking)</Label>
              <Input
                value={form.postbackUrl}
                onChange={set("postbackUrl")}
                placeholder="https://tracking.yournetwork.com/postback?click_id={click_id}"
                type="url"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Your server will receive a hit when we fire conversions to you. Must be HTTPS.
              </p>
            </div>
          </div>
        )}

        {/* Step 3 – Payout & Budget */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Advertiser payout per conversion (USD) *</Label>
                <Input
                  value={form.payoutPerConversionUsd}
                  onChange={set("payoutPerConversionUsd")}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="5.00"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Platform takes 30% — publisher receives 70%.
                </p>
              </div>
              <div>
                <Label>Daily budget (USD)</Label>
                <Input value={form.dailyBudgetUsd} onChange={set("dailyBudgetUsd")} type="number" min="1" step="0.01" placeholder="100.00" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Total budget (USD)</Label>
                <Input value={form.totalBudgetUsd} onChange={set("totalBudgetUsd")} type="number" min="1" step="0.01" placeholder="1000.00" />
              </div>
              <div>
                <Label>Daily conversion cap</Label>
                <Input value={form.dailyCap} onChange={set("dailyCap")} type="number" min="1" step="1" placeholder="e.g. 500" />
              </div>
            </div>
            <div>
              <Label>Spend alert threshold (%)</Label>
              <Input
                value={form.spendAlertThreshold}
                onChange={set("spendAlertThreshold")}
                type="number"
                min="10"
                max="99"
                step="5"
                placeholder="80"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                Receive an email when spend reaches this % of total budget.
              </p>
            </div>
          </div>
        )}

        {/* Step 4 – Targeting */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Allow countries (ISO codes, comma-separated)</Label>
                <Input value={form.geoAllow} onChange={set("geoAllow")} placeholder="US, CA, GB" />
                <p className="mt-1 text-[11px] text-gray-500">Empty = worldwide</p>
              </div>
              <div>
                <Label>Block countries</Label>
                <Input value={form.geoDeny} onChange={set("geoDeny")} placeholder="CN, RU" />
              </div>
            </div>
            <div>
              <Label>Device target</Label>
              <Select value={form.deviceTarget} onChange={set("deviceTarget")}>
                <option value="all">All devices</option>
                <option value="desktop">Desktop only</option>
                <option value="mobile">Mobile only</option>
              </Select>
            </div>
            <div>
              <Label>Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {["web", "android", "ios"].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition capitalize ${
                      form.platforms.includes(p)
                        ? "border-sky-400/80 bg-sky-400/10 text-sky-200"
                        : "border-white/10 bg-slate-900 text-gray-400 hover:border-sky-400/50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Attribution window (days)</Label>
                <Input value={form.attributionWindowDays} onChange={set("attributionWindowDays")} type="number" min="1" max="90" placeholder="30" />
              </div>
              <div>
                <Label>Start date</Label>
                <Input value={form.startDate} onChange={set("startDate")} type="date" />
              </div>
              <div>
                <Label>End date</Label>
                <Input value={form.endDate} onChange={set("endDate")} type="date" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setError(null); setStep((s) => s - 1); }}
            disabled={step === 0}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-4 py-2 text-sm text-gray-300 hover:border-sky-400/50 disabled:opacity-0 transition"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => { setError(null); setStep((s) => s + 1); }}
              disabled={!canNext()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50 transition"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !canNext()}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-50 transition"
            >
              {submitting ? "Submitting…" : "Submit for review"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
