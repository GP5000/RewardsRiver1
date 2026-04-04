"use client";

import React, { useEffect, useState } from "react";

type SettingsResponse = {
  ok: boolean;
  error?: string;
  settings?: {
    name: string;
    contactEmail: string;
    apiKey: string;
    postbackUrl: string;
    allowedDomains: string;
    ipWhitelist: string;
    trafficSources: string;
  };
};

export default function PublisherSettingsPage() {
  const [form, setForm] = useState({
    name: "",
    contactEmail: "",
    apiKey: "",
    postbackUrl: "",
    allowedDomains: "",
    ipWhitelist: "",
    trafficSources: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/publisher/settings", {
          cache: "no-store",
        });
        const json = (await res.json()) as SettingsResponse;

        if (!json.ok || !json.settings) {
          setError(json.error ?? "Failed to load settings");
        } else {
          setForm(json.settings);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const updateField =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/publisher/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Failed to save settings");
      } else {
        setMessage("Settings saved successfully.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const onTestPostback = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const res = await fetch("/api/publisher/postback-test", {
        method: "POST",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "Postback test failed");
      } else {
        setTestResult(
          `Status: ${json.status} ${json.statusText}\nURL: ${json.url}\n\nBody snippet:\n${json.bodySnippet}`
        );
      }
    } catch (err) {
      console.error(err);
      setError("Postback test failed");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="px-6 py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-slate-800" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-slate-900" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50">
        Publisher Settings
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Configure your postback URL, allowed domains, and API key used to
        integrate AdsRiver with your site.
      </p>

      <form
        onSubmit={onSave}
        className="mt-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/90 via-slate-950 to-slate-900/90 p-5 shadow-xl shadow-black/40"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
              Publisher Name
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              value={form.name}
              onChange={updateField("name")}
              placeholder="My Website Network"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
              Contact Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              value={form.contactEmail}
              onChange={updateField("contactEmail")}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
              Postback URL
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              value={form.postbackUrl}
              onChange={updateField("postbackUrl")}
              placeholder="https://your-site.com/postback?api_key=..."
            />
            <p className="text-xs text-slate-500">
              We&apos;ll call this URL when users complete offers. Use the Test
              Postback button to send a sample conversion.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
              Allowed Domains
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              value={form.allowedDomains}
              onChange={updateField("allowedDomains")}
              placeholder="example.com, another-site.com"
            />
            <p className="text-[11px] text-slate-500">
              Comma-separated. We can enforce traffic origin from these domains.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
              IP Whitelist
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              value={form.ipWhitelist}
              onChange={updateField("ipWhitelist")}
              placeholder="1.2.3.4, 5.6.7.8"
            />
            <p className="text-[11px] text-slate-500">
              Optional: restrict postback calls to these IPs.
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
              Traffic Sources
            </label>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
              value={form.trafficSources}
              onChange={updateField("trafficSources")}
              placeholder="SEO, Social, Incent, Non-incent"
            />
            <p className="text-[11px] text-slate-500">
              Helps us understand and approve your traffic types.
            </p>
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
              API Key
            </label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm font-mono text-slate-300"
                value={form.apiKey}
                readOnly
              />
              <button
                type="button"
                className="rounded-lg bg-slate-800 px-3 text-xs font-medium text-slate-100 hover:bg-slate-700"
                onClick={() => {
                  navigator.clipboard.writeText(form.apiKey).catch(() => null);
                }}
              >
                Copy
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Use this key for server-to-server calls and offerwall integration.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            {message && (
              <div className="text-xs text-emerald-400">{message}</div>
            )}
            {error && <div className="text-xs text-rose-400">{error}</div>}
            {testResult && (
              <pre className="max-h-40 overflow-auto rounded bg-slate-900 p-2 text-[11px] text-slate-200">
                {testResult}
              </pre>
            )}
          </div>

          <div className="flex gap-3 sm:justify-end">
            <button
              type="button"
              onClick={onTestPostback}
              disabled={testing || !form.postbackUrl}
              className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
            >
              {testing ? "Testing…" : "Test Postback"}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-xs font-semibold text-emerald-50 shadow hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
