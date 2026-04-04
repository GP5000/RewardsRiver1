// app/publisher/payouts/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Clock,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const MIN_PAYOUT_USD = 5;

/* ───────────────── Types ───────────────── */

type PayoutItemApi = {
  id: string;
  amountCents: number;
  currency: string;
  method: string;
  destination: string | null;
  status: string;
  createdAt: string;
  processedAt: string | null;
};

type PayoutSummaryResponse = {
  wallet?: {
    balanceCents: number;
    balanceUsd: number;
  };
  pendingPayoutsUsd?: number;
  lifetimePayoutsUsd?: number;
  items: PayoutItemApi[];
};

type PayoutRequestItem = {
  id: string;
  createdAt: string;
  method: string;
  destination: string | null;
  amount: number; // USD
  status: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

/* ───────── Loading overlay ───────── */

function LocalLoadingOverlay({
  show,
  logoSrc = "/logo2.png",
}: {
  show: boolean;
  logoSrc?: string;
}) {
  return (
    <div
      aria-hidden={!show}
      aria-busy={show}
      role="status"
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ pointerEvents: show ? "auto" : "none" }}
    >
      <motion.img
        src={logoSrc}
        alt="RewardsRiver"
        className="h-20 w-20"
        initial={{ opacity: 0, scale: 0.7, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      />
    </div>
  );
}

/* ───────── Toast ───────── */

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;
  const Icon = toast.type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[1100] max-w-sm rounded-xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/95 to-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full border text-sm ${
              toast.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="flex-1 text-sm text-gray-100">{toast.message}</div>
          <button
            onClick={onClose}
            className="ml-2 text-xs text-gray-400 hover:text-gray-200"
          >
            Close
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ───────── Page ───────── */

const PublisherPayoutsPage: React.FC = () => {
 const searchParams = useSearchParams();
const publisherId = searchParams.get("publisherId");


  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [lifetimePayouts, setLifetimePayouts] = useState(0);
  const [requests, setRequests] = useState<PayoutRequestItem[]>([]);

  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"PayPal" | "Crypto">("PayPal");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  /* ───── Fetch summary + history ───── */

  useEffect(() => {
    if (!publisherId) return;

    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/publisher/payouts?publisherId=${publisherId}`,
          { cache: "no-store" }
        );

        if (!res.ok) throw new Error("Failed to load payout data");

        const data: PayoutSummaryResponse = await res.json();

        setWalletBalance(data.wallet?.balanceUsd ?? 0);
        setPendingPayouts(data.pendingPayoutsUsd ?? 0);
        setLifetimePayouts(data.lifetimePayoutsUsd ?? 0);

        const mapped: PayoutRequestItem[] = (data.items || []).map((p) => ({
          id: p.id,
          createdAt: p.createdAt,
          method: p.method,
          destination: p.destination,
          amount: (p.amountCents ?? 0) / 100,
          status: p.status,
        }));

        setRequests(mapped);
      } catch (err) {
        console.error(err);
        setToast({
          type: "error",
          message:
            "Unable to load your payout data right now. Please refresh or try again shortly.",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [publisherId]);

  /* ───── Derived state ───── */

  const numericAmount = parseFloat(amount || "0");
  const meetsMin = numericAmount >= MIN_PAYOUT_USD;
  const hasBalance = walletBalance >= MIN_PAYOUT_USD;
  const amountExceedsBalance = numericAmount > walletBalance;

  const canSubmit =
    !submitting &&
    meetsMin &&
    !amountExceedsBalance &&
    !!destination.trim() &&
    !!publisherId;

  /* ───── Submit payout ───── */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/publisher/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publisherId,
          amountUsd: numericAmount,
          method,
          destination: destination.trim(),
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(body?.error || "Payout request failed");
      }

      setToast({
        type: "success",
        message:
          "Your payout request has been submitted. We’ll review and process it as soon as possible.",
      });

      // Update wallet balance from response if present
      if (body?.wallet?.balanceUsd !== undefined) {
        setWalletBalance(body.wallet.balanceUsd);
      }

      setAmount("");

      // Refresh list / summary from GET
      if (publisherId) {
        const refreshed = await fetch(
          `/api/publisher/payouts?publisherId=${publisherId}`,
          { cache: "no-store" }
        );
        if (refreshed.ok) {
          const data: PayoutSummaryResponse = await refreshed.json();
          setWalletBalance(data.wallet?.balanceUsd ?? 0);
          setPendingPayouts(data.pendingPayoutsUsd ?? 0);
          setLifetimePayouts(data.lifetimePayoutsUsd ?? 0);
          const mapped: PayoutRequestItem[] = (data.items || []).map((p) => ({
            id: p.id,
            createdAt: p.createdAt,
            method: p.method,
            destination: p.destination,
            amount: (p.amountCents ?? 0) / 100,
            status: p.status,
          }));
          setRequests(mapped);
        }
      }
    } catch (err: any) {
      console.error(err);
      setToast({
        type: "error",
        message:
          err?.message ||
          "Something went wrong while submitting your payout request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* ───── Helpers ───── */

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusStyles: Record<string, string> = {
    pending:
      "border-amber-400/50 bg-amber-500/10 text-amber-200 text-[11px] px-2 py-0.5 rounded-full",
    approved:
      "border-sky-400/50 bg-sky-500/10 text-sky-200 text-[11px] px-2 py-0.5 rounded-full",
    paid: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200 text-[11px] px-2 py-0.5 rounded-full",
    rejected:
      "border-red-400/50 bg-red-500/10 text-red-200 text-[11px] px-2 py-0.5 rounded-full",
  };

  return (
    <>
      <LocalLoadingOverlay show={loading && !requests.length} />
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
            Payouts
          </h1>
          <p className="max-w-2xl text-sm text-gray-400">
            Request withdrawals from your RewardsRiver wallet and track your
            payout history. As we onboard more payout partners, you’ll unlock
            additional methods and higher limits.
          </p>
        </div>

        {/* Wallet summary card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#020617] via-[#020617] to-[#030712] px-5 py-5 shadow-[0_0_40px_rgba(56,189,248,0.25)]/10"
        >
          <div className="pointer-events-none absolute -left-24 top-[-40%] h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-[-40%] h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/80 to-sky-500/90 shadow-lg shadow-cyan-500/50">
                <Wallet className="h-6 w-6 text-slate-950" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300/70">
                  Wallet balance
                </p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  ${walletBalance.toFixed(2)}
                </p>
                <p className="mt-1 text-[11px] text-gray-400">
                  Minimum payout is{" "}
                  <span className="font-medium text-cyan-300">
                    ${MIN_PAYOUT_USD.toFixed(2)}
                  </span>
                  . Thresholds and methods will expand as we onboard more
                  partners.
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs text-gray-300 backdrop-blur">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  <Clock className="h-3 w-3" />
                  Pending payouts
                </div>
                <p className="mt-1 text-lg font-semibold text-white">
                  ${pendingPayouts.toFixed(2)}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Requested, not yet processed.
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-xs text-gray-300 backdrop-blur">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  <ArrowRightLeft className="h-3 w-3" />
                  Lifetime payouts
                </div>
                <p className="mt-1 text-lg font-semibold text-white">
                  ${lifetimePayouts.toFixed(2)}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Total withdrawn from RewardsRiver.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Form + History */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.3fr)]">
          {/* Request payout form */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 shadow-lg backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Request payout
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Choose your payout method and destination. Make sure your
                  details are correct before submitting.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">
                  Amount (USD)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/80 pl-6 pr-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/70 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/50"
                      placeholder={MIN_PAYOUT_USD.toFixed(2)}
                    />
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-gray-400">
                    Available:{" "}
                    <span className="font-medium text-gray-200">
                      ${walletBalance.toFixed(2)}
                    </span>
                  </span>
                  <span className="h-1 w-1 rounded-full bg-gray-600" />
                  <span
                    className={
                      meetsMin && !amountExceedsBalance
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }
                  >
                    Minimum payout: ${MIN_PAYOUT_USD.toFixed(2)}
                  </span>
                </div>
                {!hasBalance && (
                  <p className="mt-1 text-[11px] text-amber-300/90">
                    You’ll be able to request a payout once your balance reaches
                    ${MIN_PAYOUT_USD.toFixed(2)}.
                  </p>
                )}
                {amountExceedsBalance && (
                  <p className="mt-1 text-[11px] text-red-300">
                    Amount exceeds your available wallet balance.
                  </p>
                )}
              </div>

              {/* Method */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">
                  Method
                </label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/70 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/50"
                >
                  <option value="PayPal">PayPal</option>
                  <option value="Crypto">Crypto (USDT/USDC)</option>
                </select>
                <p className="mt-1 text-[11px] text-gray-400">
                  We’ll expand payout options as we integrate more partners.
                </p>
              </div>

              {/* Destination */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-300">
                  {method === "PayPal"
                    ? "PayPal email"
                    : "Crypto address (USDT/USDC)"}
                </label>
                <input
                  type={method === "PayPal" ? "email" : "text"}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="h-10 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 text-sm text-white outline-none ring-0 transition focus:border-cyan-400/70 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/50"
                  placeholder={
                    method === "PayPal"
                      ? "you@example.com"
                      : "0x… or exchange deposit address"
                  }
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Double-check this before submitting. Payouts sent to the wrong
                  destination cannot be reversed.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 transition hover:from-cyan-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-700 disabled:text-gray-300"
                >
                  {submitting ? "Submitting request…" : "Submit payout request"}
                </button>
                {!publisherId && (
                  <p className="mt-2 text-[11px] text-amber-300">
                    You must be logged in as a publisher to request a payout.
                  </p>
                )}
              </div>
            </form>
          </motion.div>

          {/* Payout history */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 shadow-lg backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Payout history
                </h2>
                <p className="mt-1 text-xs text-gray-400">
                  Track all payout requests associated with your RewardsRiver
                  publisher account.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950/60">
              <div className="grid grid-cols-[1.3fr_1fr_1.1fr_0.9fr] gap-3 border-b border-white/5 bg-slate-900/80 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">
                <span>Created</span>
                <span>Method</span>
                <span>Destination</span>
                <span className="text-right">Amount / Status</span>
              </div>

              {requests.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-gray-500">
                  No payout requests yet. Once you request a payout, it will
                  appear here with its current status.
                </div>
              ) : (
                <div className="divide-y divide-white/5 text-xs">
                  {requests.map((req) => (
                    <div
                      key={req.id}
                      className="grid grid-cols-[1.3fr_1fr_1.1fr_0.9fr] gap-3 px-4 py-3 hover:bg-slate-900/70"
                    >
                      <div className="flex flex-col">
                        <span className="text-gray-200">
                          {formatDate(req.createdAt)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-gray-200">{req.method}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="truncate text-gray-300">
                          {req.destination}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-semibold text-white">
                          ${req.amount.toFixed(2)}
                        </span>
                        <span
                          className={
                            statusStyles[req.status] ??
                            "border-white/20 bg-slate-800 text-gray-200 text-[11px] px-2 py-0.5 rounded-full"
                          }
                        >
                          {req.status.charAt(0).toUpperCase() +
                            req.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default PublisherPayoutsPage;
