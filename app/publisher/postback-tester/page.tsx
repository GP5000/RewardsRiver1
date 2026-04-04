"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Loader2, Radio, Zap } from "lucide-react";

type EventType = "conversion" | "reversal" | "bonus" | "custom";

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

function CodeBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-4 text-xs">
      <div className="mb-2 flex items-center justify-between text-[11px] text-gray-400">
        <span>{label}</span>
        <button
          onClick={onCopy}
          disabled={!value}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-gray-200 hover:bg-white/10 disabled:opacity-40"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-gray-100">
        {value || "// Fill out the fields above to generate a URL"}
      </pre>
    </div>
  );
}

export default function PostbackTesterPage() {
  const searchParams = useSearchParams();
  const detectedPid = searchParams.get("publisherId") || "";
  const detectedPlacement = searchParams.get("placement_id") || "";

  const [publisherId, setPublisherId] = useState(detectedPid);
  const [placementId, setPlacementId] = useState(detectedPlacement);
  const [baseUrl, setBaseUrl] = useState(
    "https://your-app.com/rewardsriver/postback"
  );
  const [eventType, setEventType] = useState<EventType>("conversion");
  const [userId, setUserId] = useState("demo_user_123");
  const [transactionId, setTransactionId] = useState("test_tx_001");
  const [amount, setAmount] = useState("1.20");
  const [currency, setCurrency] = useState("USD");
  const [offerId, setOfferId] = useState("42");
  const [extra, setExtra] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    status?: number;
    ok?: boolean;
    statusText?: string;
    bodySnippet?: string;
    error?: string;
  } | null>(null);

  const generatedUrl = useMemo(() => {
    if (!baseUrl) return "";

    try {
      const url = new URL(baseUrl);

      if (publisherId) url.searchParams.set("pid", publisherId);
      if (userId) url.searchParams.set("user", userId);
      if (transactionId) url.searchParams.set("tx", transactionId);
      if (amount) url.searchParams.set("amount", amount);
      if (currency) url.searchParams.set("currency", currency);
      if (offerId) url.searchParams.set("offer_id", offerId);
      if (placementId) url.searchParams.set("placement_id", placementId);
      if (eventType) url.searchParams.set("event", eventType);

      if (extra.trim()) {
        url.searchParams.set("extra", extra.trim());
      }

      return url.toString();
    } catch {
      return "";
    }
  }, [
    baseUrl,
    publisherId,
    userId,
    transactionId,
    amount,
    currency,
    offerId,
    placementId,
    eventType,
    extra,
  ]);

  const handleSend = async () => {
    setResult(null);

    if (!generatedUrl) {
      setResult({
        ok: false,
        error: "Generated URL is invalid. Check the base URL and fields.",
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/publisher/postback-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: generatedUrl,
          method: "GET",
        }),
      });

      const data = await res.json();

      setResult({
        status: data.status,
        ok: data.ok,
        statusText: data.statusText,
        bodySnippet: data.bodySnippet,
        error: data.error,
      });
    } catch (err: any) {
      setResult({
        ok: false,
        error: err?.message || "Unknown error while sending test postback.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl text-white">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Zap className="h-7 w-7 text-emerald-400" />
        <div>
          <h1 className="text-3xl font-semibold">Postback Tester</h1>
          <p className="text-sm text-gray-300">
            Validate your RewardsRiver postback setup in a safe test
            environment. We&apos;ll fire a live HTTP request to your endpoint
            with the params below.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="space-y-6 rounded-2xl border border-white/10 bg-[#050814]/90 p-6">
        {/* Publisher & placement context */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-300">
              Publisher ID
            </label>
            <input
              value={publisherId}
              onChange={(e) => setPublisherId(e.target.value)}
              placeholder="Your RewardsRiver publisherId"
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
            />
            {detectedPid && (
              <p className="mt-1 text-[11px] text-emerald-300">
                Detected from URL:{" "}
                <span className="font-mono">{detectedPid}</span>
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-300">
              Placement ID (optional)
            </label>
            <input
              value={placementId}
              onChange={(e) => setPlacementId(e.target.value)}
              placeholder="Placement you are testing (from Placements page)"
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
            />
            {detectedPlacement && (
              <p className="mt-1 text-[11px] text-emerald-300">
                Detected from URL:{" "}
                <span className="font-mono">{detectedPlacement}</span>
              </p>
            )}
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className="text-xs font-semibold text-gray-300">
            Postback endpoint URL
          </label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://your-app.com/rewardsriver/postback"
            className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[11px] text-gray-400">
            This is your server endpoint that receives RewardsRiver conversions.
            We&apos;ll append query parameters like <code>pid</code>,{" "}
            <code>user</code>, <code>amount</code>, <code>event</code>, etc.
          </p>
        </div>

        {/* Event + monetary params */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-gray-300">
              Event type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
            >
              <option value="conversion">Conversion (default)</option>
              <option value="bonus">Bonus / Adjustment</option>
              <option value="reversal">Reversal / Chargeback</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-300">
                Amount
              </label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-300">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* User + offer params */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-gray-300">
              User ID
            </label>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Your internal user identifier"
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-300">
              Transaction ID
            </label>
            <input
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Test transaction id"
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-300">
              Offer ID
            </label>
            <input
              value={offerId}
              onChange={(e) => setOfferId(e.target.value)}
              placeholder="Optional offer id"
              className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Extra param */}
        <div>
          <label className="text-xs font-semibold text-gray-300">
            Extra parameter (optional)
          </label>
          <input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Any extra value you want to pass (e.g. signature hash)"
            className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm"
          />
        </div>

        {/* Generated URL */}
        <CodeBlock label="Generated test postback URL" value={generatedUrl}>

        </CodeBlock>

        {/* Send button + result */}
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <button
            onClick={handleSend}
            disabled={sending || !generatedUrl}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending test postback…
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" />
                Send test postback
              </>
            )}
          </button>

          {result && (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                result.ok
                  ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-200"
                  : "border-red-500/40 bg-red-500/5 text-red-200"
              }`}
            >
              {result.error ? (
                <div>{result.error}</div>
              ) : (
                <div className="space-y-1">
                  <div>
                    Status:{" "}
                    <span className="font-mono">
                      {result.status} {result.statusText}
                    </span>
                  </div>
                  {result.bodySnippet && (
                    <div className="text-[11px] text-gray-100">
                      Response snippet:{" "}
                      <span className="font-mono">
                        {result.bodySnippet}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Helper note */}
      <p className="mt-4 text-xs text-gray-400">
        Tip: Once you&apos;re happy with your setup, you can trigger additional
        tests from your own environment using the generated URL. In production,
        RewardsRiver will send these postbacks automatically whenever a user
        completes an offer.
      </p>
    </div>
  );
}
