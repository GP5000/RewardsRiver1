// app/admin/settings/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";

type Settings = {
  platformFeePercent: number;
  minPayoutCents: number;
  fraudClickVelocityLimit: number;
  fraudCvrThreshold: number;
  fraudIpMismatchThreshold: number;
  referralBonusPercent: number;
  referralBonusCapCents: number;
  referralWindowDays: number;
  autoApproveConversions: boolean;
};

function Field({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-4 sm:flex-row sm:items-center sm:justify-between last:border-0">
      <div className="sm:w-64">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      </div>
      <div className="sm:w-48">{children}</div>
    </div>
  );
}

function NumInput({
  value,
  onChange,
  min,
  max,
  step = "1",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
    />
  );
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setSettings(data.settings);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (field: keyof Settings) => (value: number | boolean) =>
    setSettings((s) => s ? { ...s, [field]: value } : s);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setError(null);
    setSuccess(null);
    setSaving(true);

    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.ok) { setError(data.error); return; }
    setSuccess("Settings saved successfully.");
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" /></div>;
  }

  if (!settings) {
    return <div className="text-sm text-slate-400">Failed to load settings.</div>;
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Configure platform-wide constants.</p>
      </div>

      {/* Revenue */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-2">
        <h2 className="pt-4 pb-2 text-sm font-semibold text-white border-b border-white/5">Revenue</h2>

        <Field label="Platform fee (%)" sub="Publishers receive (100 - fee)%">
          <NumInput value={settings.platformFeePercent} onChange={set("platformFeePercent") as any} min={0} max={99} />
        </Field>

        <Field label="Minimum payout (cents)" sub="$25.00 default = 2500">
          <NumInput value={settings.minPayoutCents} onChange={set("minPayoutCents") as any} min={100} />
        </Field>
      </div>

      {/* Fraud */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-2">
        <h2 className="pt-4 pb-2 text-sm font-semibold text-white border-b border-white/5">Fraud thresholds</h2>

        <Field label="Click velocity limit" sub="Clicks per IP per 24h before flagging">
          <NumInput value={settings.fraudClickVelocityLimit} onChange={set("fraudClickVelocityLimit") as any} min={1} />
        </Field>

        <Field label="CVR anomaly threshold" sub="0.5 = 50% CVR flags as suspicious">
          <NumInput value={settings.fraudCvrThreshold} onChange={set("fraudCvrThreshold") as any} min={0.01} max={1} step="0.01" />
        </Field>

        <Field label="IP mismatch threshold" sub="Fraction of conversions with IP mismatch before flagging">
          <NumInput value={settings.fraudIpMismatchThreshold} onChange={set("fraudIpMismatchThreshold") as any} min={0.01} max={1} step="0.01" />
        </Field>
      </div>

      {/* Referrals */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-2">
        <h2 className="pt-4 pb-2 text-sm font-semibold text-white border-b border-white/5">Referral program</h2>

        <Field label="Referral bonus (%)" sub="% of publisher payout credited to referrer">
          <NumInput value={settings.referralBonusPercent} onChange={set("referralBonusPercent") as any} min={0} max={50} />
        </Field>

        <Field label="Referral bonus cap (cents)" sub="Max bonus per conversion ($50 = 5000)">
          <NumInput value={settings.referralBonusCapCents} onChange={set("referralBonusCapCents") as any} min={0} />
        </Field>

        <Field label="Referral window (days)" sub="Bonus applies within this many days of signup">
          <NumInput value={settings.referralWindowDays} onChange={set("referralWindowDays") as any} min={1} max={365} />
        </Field>
      </div>

      {/* Automation */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-2">
        <h2 className="pt-4 pb-2 text-sm font-semibold text-white border-b border-white/5">Automation</h2>

        <Field label="Auto-approve conversions" sub="Automatically approve pending conversions">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set("autoApproveConversions")(!settings.autoApproveConversions)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.autoApproveConversions ? "bg-cyan-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
                  settings.autoApproveConversions ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </div>
            <span className={`text-sm ${settings.autoApproveConversions ? "text-cyan-300" : "text-slate-400"}`}>
              {settings.autoApproveConversions ? "Enabled" : "Disabled"}
            </span>
          </label>
        </Field>
      </div>

      {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">{error}</div>}
      {success && <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 border border-emerald-500/40">{success}</div>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-6 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 transition"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
