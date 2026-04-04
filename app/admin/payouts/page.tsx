// app/admin/payouts/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react";

type PayoutRequest = {
  id: string;
  publisherId: string;
  amountCents: number;
  currency: string;
  method: string;
  destination: string | null;
  status: string;
  createdAt: string;
  processedAt: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  approved: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  processing: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
};

const FILTERS = ["pending", "approved", "processing", "paid", "rejected", "all"];

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async (s: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/payouts?status=${s}`, { cache: "no-store" });
    const data = await res.json();
    if (data.items) setPayouts(data.items);
    setLoading(false);
  };

  useEffect(() => { load(status); }, [status]);

  const doAction = async (id: string, action: "approve" | "reject" | "markPaid") => {
    setActioning(id);
    setError(null);
    const res = await fetch("/api/admin/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutRequestId: id, action }),
    });
    const data = await res.json();
    setActioning(null);
    if (!data.ok) { setError(data.error); return; }
    load(status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Payouts</h1>
          <p className="mt-1 text-sm text-slate-400">Review and approve publisher payout requests.</p>
        </div>
        <button
          onClick={() => load(status)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-2 text-xs text-gray-300 hover:border-cyan-400/50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition capitalize ${
              status === f
                ? "border-cyan-400/80 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-slate-900/70 text-gray-300 hover:border-cyan-400/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-400">
          No payout requests with status &quot;{status}&quot;.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/80">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-white/5 bg-slate-900/80 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
            <span>Publisher ID</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Status</span>
            <span>Requested</span>
            <span />
          </div>
          <div className="divide-y divide-white/5">
            {payouts.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-slate-900/30 sm:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <span className="font-mono text-xs text-gray-400 truncate">{p.publisherId}</span>
                <span className="text-sm font-semibold text-white">${(p.amountCents / 100).toFixed(2)}</span>
                <span className="text-xs text-gray-300 capitalize">{p.method ?? "—"}</span>
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[p.status] ?? STATUS_BADGE.pending}`}>
                  {p.status}
                </span>
                <span className="text-[11px] text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</span>

                <div className="flex items-center gap-2">
                  {p.status === "pending" && (
                    <>
                      <button
                        onClick={() => doAction(p.id, "approve")}
                        disabled={actioning === p.id}
                        title="Approve"
                        className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => doAction(p.id, "reject")}
                        disabled={actioning === p.id}
                        title="Reject & refund"
                        className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  {p.status === "approved" && (
                    <button
                      onClick={() => doAction(p.id, "markPaid")}
                      disabled={actioning === p.id}
                      className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-300 hover:bg-sky-500/20 disabled:opacity-50 transition"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
