"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

type Platform = "web" | "android" | "ios" | "desktop";

export default function AddPlacementPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [appName, setAppName] = useState("");
  const [platform, setPlatform] = useState<Platform>("web");
  const [url, setUrl] = useState("");
  const [primaryGeo, setPrimaryGeo] = useState("GLOBAL");
  const [notes, setNotes] = useState("");
  const [marginPercent, setMarginPercent] = useState("0");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Placement name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/publisher/placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          appName: appName.trim() || undefined,
          platform,
          url: url.trim() || undefined,
          primaryGeo: primaryGeo.trim() || "GLOBAL",
          notes: notes.trim() || undefined,
          marginPercent: Math.min(100, Math.max(0, parseFloat(marginPercent) || 0)),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.ok === false) {
        if (res.status === 401) {
          throw new Error("You must be signed in as a publisher to create placements.");
        }
        throw new Error(data.error || data.message || "Failed to create placement.");
      }

      setSuccess("Placement created successfully.");
      setTimeout(() => {
        router.push("/publisher/placements");
      }, 800);
    } catch (err: any) {
      console.error("ADD PLACEMENT ERROR:", err);
      setError(err?.message || "Failed to create placement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl text-white">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Add Placement</h1>
        <p className="mt-1 text-sm text-gray-300">
          Define a new placement where your RewardsRiver offerwall or widgets will appear.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-200 border border-red-500/40">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 border border-emerald-500/40">
          {success}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-xl border border-white/10 bg-[#050814]/90 p-6 shadow-xl"
      >
        {/* Placement name */}
        <div>
          <label className="block text-xs font-semibold text-gray-300">
            Placement name
          </label>
          <input
            className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Header offerwall, mobile interstitial, etc."
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Site / app */}
        <div>
          <label className="block text-xs font-semibold text-gray-300">
            Site / app
          </label>
          <input
            className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Your site or app name"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
          />
        </div>

        {/* Platform + URL */}
        <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
          <div>
            <label className="block text-xs font-semibold text-gray-300">
              Platform
            </label>
            <select
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              <option value="web">Web</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300">
              URL / package (optional)
            </label>
            <input
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="https://your-site.com or app package"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>

        {/* GEO */}
        <div>
          <label className="block text-xs font-semibold text-gray-300">
            Primary GEO
          </label>
          <input
            className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="GLOBAL, US, DE, BR…"
            value={primaryGeo}
            onChange={(e) => setPrimaryGeo(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Used to prioritise offers for this placement. You can still receive global
            traffic.
          </p>
        </div>

        {/* Margin */}
        <div>
          <label className="block text-xs font-semibold text-gray-300">
            Publisher margin %
          </label>
          <div className="relative mt-1 w-40">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              className="w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="0"
              value={marginPercent}
              onChange={(e) => setMarginPercent(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
          </div>
          <p className="mt-1 text-[11px] text-gray-400">
            Users see the offer payout reduced by this amount. You collect the full payout and keep the difference as profit.
            {parseFloat(marginPercent) > 0 && (
              <span className="ml-1 text-gray-300">
                e.g. a $100 offer → user sees <strong>${(100 * (1 - parseFloat(marginPercent) / 100)).toFixed(2)}</strong>, you earn <strong className="text-emerald-400">$100</strong>.
              </span>
            )}
          </p>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-300">
            Internal notes (optional)
          </label>
          <textarea
            className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="Describe where users see this placement, traffic quality, or any restrictions."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create placement"}
          </button>

          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-200"
            onClick={() => router.push("/publisher/placements")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
