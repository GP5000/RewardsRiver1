"use client";

import { useEffect, useState } from "react";

type Tx = {
  id: string;
  type: string;
  amountCents: number;
  amountUsd: number;
  description: string | null;
  createdAt: string;
};

const TX_TYPE_LABEL: Record<string, string> = {
  ad_spend: "Ad spend",
  deposit: "Deposit",
  refund: "Refund",
};

const TX_COLOR: Record<string, string> = {
  ad_spend: "text-rose-400",
  deposit: "text-emerald-400",
  refund: "text-sky-400",
};

export default function AdvertiserBillingPage() {
  const [wallet, setWallet] = useState<{ balanceCents: number; balanceUsd: number } | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/advertiser/billing", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) throw new Error(d.error);
        setWallet(d.wallet);
        setTxs(d.transactions);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-950/20 px-5 py-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing</h1>
        <p className="mt-1 text-sm text-gray-400">Wallet balance and transaction history.</p>
      </div>

      {/* Balance card */}
      <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-slate-950 via-[#0c1a2e] to-slate-950 px-6 py-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-400/70">Available balance</p>
        <p className="mt-2 text-4xl font-semibold text-white">
          ${wallet?.balanceUsd.toFixed(2) ?? "0.00"}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          To add funds, contact your account manager or use the deposit form.
        </p>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
        <div className="border-b border-white/5 bg-slate-900/80 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Transaction history</h2>
        </div>
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-white/5 bg-slate-900/50 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
          <span>Description</span>
          <span>Type</span>
          <span className="text-right">Amount</span>
          <span className="text-right">Date</span>
        </div>
        {txs.length === 0 ? (
          <p className="px-5 py-8 text-center text-xs text-gray-500">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-1 gap-2 px-5 py-3 hover:bg-slate-900/30 sm:grid-cols-[2fr_1fr_1fr_1fr] sm:items-center sm:gap-4"
              >
                <span className="text-gray-300">{tx.description || "—"}</span>
                <span className="text-xs text-gray-400">{TX_TYPE_LABEL[tx.type] ?? tx.type}</span>
                <span className={`text-right font-mono text-sm font-medium ${TX_COLOR[tx.type] ?? "text-gray-300"}`}>
                  {tx.amountUsd < 0 ? "-" : "+"}${Math.abs(tx.amountUsd).toFixed(2)}
                </span>
                <span className="text-right text-[11px] text-gray-500">
                  {new Date(tx.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
