"use client";

import { useEffect, useState, FormEvent } from "react";
import { Eye, EyeOff, RefreshCw } from "lucide-react";

type Settings = {
  companyName: string;
  contactEmail: string | null;
  websiteUrl: string | null;
  postbackUrl: string | null;
  status: string;
  apiKeySuffix: string | null;
};

export default function AdvertiserSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: "",
    contactEmail: "",
    websiteUrl: "",
    postbackUrl: "",
  });

  const load = async () => {
    const res = await fetch("/api/advertiser/settings", { cache: "no-store" });
    const data = await res.json();
    if (data.ok) {
      setSettings(data.settings);
      setForm({
        companyName: data.settings.companyName ?? "",
        contactEmail: data.settings.contactEmail ?? "",
        websiteUrl: data.settings.websiteUrl ?? "",
        postbackUrl: data.settings.postbackUrl ?? "",
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    const res = await fetch("/api/advertiser/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);

    if (!data.ok) { setError(data.error); return; }
    setSuccess("Settings saved.");
    load();
  };

  const handleRegenKey = async () => {
    if (!confirm("Regenerate your API key? Your existing key will stop working immediately.")) return;
    setRegenLoading(true);
    setNewApiKey(null);
    const res = await fetch("/api/advertiser/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenApiKey: true }),
    });
    const data = await res.json();
    setRegenLoading(false);
    if (data.apiKey) setNewApiKey(data.apiKey);
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your company profile and API access.
          {settings?.status && (
            <span className="ml-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-300">
              {settings.status}
            </span>
          )}
        </p>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-white/10 bg-slate-950/80 px-6 py-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">Company profile</h2>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Company name</label>
          <input
            value={form.companyName}
            onChange={set("companyName")}
            className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Contact email</label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={set("contactEmail")}
            className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">Website URL</label>
          <input
            type="url"
            value={form.websiteUrl}
            onChange={set("websiteUrl")}
            className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            placeholder="https://yourcompany.com"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Default postback URL <span className="text-gray-500">(optional, override per campaign)</span>
          </label>
          <input
            type="url"
            value={form.postbackUrl}
            onChange={set("postbackUrl")}
            className="w-full rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
            placeholder="https://yournetwork.com/postback"
          />
        </div>

        {error && (
          <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">{error}</div>
        )}
        {success && (
          <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 border border-emerald-500/40">{success}</div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:brightness-110 disabled:opacity-60 transition"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* API key */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-6 py-6 space-y-4">
        <h2 className="text-sm font-semibold text-white">API key</h2>

        {newApiKey ? (
          <div>
            <p className="text-xs text-amber-300 mb-2">
              Save this key — it will only be shown once.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border border-sky-500/30 bg-slate-900 px-4 py-2 font-mono text-sm text-sky-300 break-all">
                {showKey ? newApiKey : "•".repeat(newApiKey.length)}
              </div>
              <button onClick={() => setShowKey((v) => !v)} className="text-gray-400 hover:text-gray-200">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-400">
              Current key: <span className="font-mono text-gray-200">…{settings?.apiKeySuffix ?? "none"}</span>
            </p>
          </div>
        )}

        <button
          onClick={handleRegenKey}
          disabled={regenLoading}
          className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {regenLoading ? "Regenerating…" : "Regenerate API key"}
        </button>
        <p className="text-[11px] text-gray-500">
          Regenerating immediately invalidates your current key.
        </p>
      </div>
    </div>
  );
}
