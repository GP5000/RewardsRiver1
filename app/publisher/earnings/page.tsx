"use client";

import { useEffect, useState } from "react";

type Tx = {
  id: string;
  type: string;
  typeLabel: string;
  amountCents: number;
  amountUsd: number;
  description: string | null;
  createdAt: string;
};

const TYPE_COLOR: Record<string, string> = {
  conversion_credit: "text-emerald-400",
  referral_bonus: "text-cyan-400",
  payout_pending: "text-amber-400",
  payout_settled: "text-rose-400",
  payout_refund: "text-sky-400",
  deposit: "text-emerald-400",
  ad_spend: "text-rose-400",
};

const POSITIVE_TYPES = new Set(["conversion_credit", "referral_bonus", "payout_refund", "deposit"]);

export default function PublisherEarningsPage() {
  const [wallet, setWallet] = useState<{ balanceCents: number; balanceUsd: number } | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skip, setSkip] = useState(0);

  const LIMIT = 50;

  const load = async (s: number) => {
    setLoading(true);
    const res = await fetch(`/api/publisher/earnings?limit=${LIMIT}&skip=${s}`, { cache: "no-store" });
    const data = await res.json();
    if (!data.ok) { setError(data.error); setLoading(false); return; }
    setWallet(data.wallet);
    setTotal(data.total);
    setTxs(data.transactions);
    setLoading(false);
  };

  useEffect(() => { load(skip); }, [skip]);

  if (loading && txs.length === 0) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">{error}</div>
    );
  }

  // Running balance calculation (from oldest to newest, then reverse)
  const runningBalances: number[] = [];
  let balance = wallet?.balanceCents ?? 0;
  // txs is newest-first, so we walk backward to compute running balance
  for (let i = txs.length - 1; i >= 0; i--) {
    runningBalances[i] = balance;
    balance -= txs[i].amountCents;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-10">
      <div>
        <h1 className="bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
          Earnings
        </h1>
        <p className="mt-1 text-sm text-gray-400">Complete transaction history for your account.</p>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-[#0c1220] to-slate-950 px-6 py-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-cyan-400/70">Available balance</p>
        <p className="mt-1 text-4xl font-semibold text-white">${wallet?.balanceUsd.toFixed(2) ?? "0.00"}</p>
      </div>

      {/* Transaction table */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
        <div className="border-b border-white/5 bg-slate-900/80 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Transaction history</h2>
          <span className="text-[11px] text-gray-500">{total} total</span>
        </div>

        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-white/5 bg-slate-900/50 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
          <span>Description</span>
          <span>Type</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Balance after</span>
          <span className="text-right">Date</span>
        </div>

        {txs.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-gray-500">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            {txs.map((tx, i) => {
              const isPositive = POSITIVE_TYPES.has(tx.type);
              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3 hover:bg-slate-900/30 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr] sm:items-center sm:gap-4"
                >
                  <span className="text-gray-300">{tx.description ?? tx.typeLabel}</span>
                  <span className={`text-xs ${TYPE_COLOR[tx.type] ?? "text-gray-400"}`}>{tx.typeLabel}</span>
                  <span className={`text-right font-mono font-medium ${isPositive ? "text-emerald-300" : "text-rose-300"}`}>
                    {isPositive ? "+" : "−"}${Math.abs(tx.amountUsd).toFixed(2)}
                  </span>
                  <span className="text-right font-mono text-xs text-gray-400">
                    ${(runningBalances[i] / 100).toFixed(2)}
                  </span>
                  <span className="text-right text-[11px] text-gray-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between border-t border-white/5 px-5 py-3">
            <button
              onClick={() => setSkip(Math.max(0, skip - LIMIT))}
              disabled={skip === 0}
              className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-[11px] text-gray-500">
              {skip + 1}–{Math.min(skip + LIMIT, total)} of {total}
            </span>
            <button
              onClick={() => setSkip(skip + LIMIT)}
              disabled={skip + LIMIT >= total}
              className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
