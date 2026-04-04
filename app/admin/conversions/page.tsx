"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

type ConversionRow = {
  id: string;
  conversionStatus: "pending" | "approved" | "rejected" | "paid";
  clickId: string | null;
  subId: string | null;
  payoutUsd: number;
  advertiserPayoutUsd: number;
  offer: { id: string; name: string } | null;
  publisher: { id: string; name: string } | null;
  createdAt: string;
};

type ConversionsResponse = {
  ok: boolean;
  total: number;
  conversions: ConversionRow[];
};

const STATUS_TABS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
] as const;

type StatusTab = (typeof STATUS_TABS)[number]["value"];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border border-rose-500/30",
  paid: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
};

const PAGE_SIZE = 50;

export default function AdminConversionsPage() {
  const [status, setStatus] = useState<StatusTab>("pending");
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(
    async (statusVal: StatusTab, skipVal: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/conversions?status=${statusVal}&limit=${PAGE_SIZE}&skip=${skipVal}`,
          { cache: "no-store" }
        );
        const data: ConversionsResponse = await res.json();
        if (!data.ok) throw new Error("Load failed");
        setConversions(data.conversions);
        setTotal(data.total);
      } catch {
        showToast("Failed to load conversions", false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    setSkip(0);
    load(status, 0);
  }, [status, load]);

  const handleAction = async (id: string, action: "approve" | "reject", reason?: string) => {
    setActing(id);
    try {
      const res = await fetch(`/api/admin/conversions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Action failed");
      showToast(action === "approve" ? "Conversion approved" : "Conversion rejected", true);
      // Remove from list if filtered
      setConversions((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => t - 1);
    } catch (err: any) {
      showToast(err?.message ?? "Action failed", false);
    } finally {
      setActing(null);
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  const handleBulkApprove = async () => {
    const pending = conversions.filter((c) => c.conversionStatus === "pending");
    if (!pending.length) return;
    if (!confirm(`Approve all ${pending.length} pending conversions on this page?`)) return;

    for (const c of pending) {
      await handleAction(c.id, "approve");
    }
  };

  const page = Math.floor(skip / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[1100] rounded-xl border px-4 py-2 text-xs shadow-lg backdrop-blur ${
            toast.ok
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
              : "border-rose-400/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Reject reason modal */}
      {rejectTarget && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Reject conversion</h3>
            <p className="mt-1 text-xs text-gray-400">
              Optional reason (will be logged in the audit trail).
            </p>
            <textarea
              className="mt-3 w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs text-gray-200 outline-none focus:border-cyan-500"
              rows={3}
              placeholder="e.g. Suspicious IP pattern, duplicate subId..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                className="rounded-lg border border-white/15 px-4 py-1.5 text-xs text-gray-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(rejectTarget, "reject", rejectReason || undefined)}
                disabled={!!acting}
                className="rounded-lg bg-rose-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-400 disabled:opacity-60"
              >
                {acting ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-white">Conversions</h1>
            <p className="mt-1 text-xs text-gray-400">
              Review and approve pending publisher conversions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {status === "pending" && conversions.some((c) => c.conversionStatus === "pending") && (
              <button
                onClick={handleBulkApprove}
                disabled={!!acting}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                Approve all on page
              </button>
            )}
            <button
              onClick={() => load(status, skip)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900/80 px-3 py-1.5 text-xs text-gray-300 hover:bg-slate-900"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="mt-5 flex gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1 w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition ${
                status === tab.value
                  ? "bg-cyan-500 text-slate-950"
                  : "text-gray-400 hover:bg-slate-800 hover:text-gray-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/80 shadow-lg">
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-500">Loading…</div>
          ) : conversions.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="mx-auto h-8 w-8 text-gray-600" />
              <p className="mt-3 text-xs text-gray-500">
                No {status === "all" ? "" : status} conversions found.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs text-gray-300">
                <thead className="border-b border-white/10 bg-slate-900/80 text-[11px] uppercase tracking-[0.18em] text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Publisher</th>
                    <th className="px-4 py-3">Offer</th>
                    <th className="px-4 py-3">Click ID</th>
                    <th className="px-4 py-3">Sub ID</th>
                    <th className="px-4 py-3 text-right">Publisher Payout</th>
                    <th className="px-4 py-3 text-right">Adv. Payout</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {conversions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-900/50 transition">
                      <td className="px-4 py-3 font-medium text-gray-100">
                        {c.publisher?.name ?? (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-200">
                        {c.offer?.name ?? (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                        {c.clickId ? c.clickId.slice(-12) : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-400">
                        {c.subId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">
                        ${c.payoutUsd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        ${c.advertiserPayoutUsd.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            STATUS_BADGE[c.conversionStatus] ?? "text-gray-400"
                          }`}
                        >
                          {c.conversionStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {c.conversionStatus === "pending" ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(c.id, "approve")}
                              disabled={!!acting}
                              title="Approve"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectTarget(c.id)}
                              disabled={!!acting}
                              title="Reject"
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="block text-right text-[11px] text-gray-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-gray-400">
              <span>
                {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => { const s = Math.max(0, skip - PAGE_SIZE); setSkip(s); load(status, s); }}
                  disabled={skip === 0}
                  className="rounded-lg border border-white/15 px-3 py-1 hover:bg-slate-800 disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => { const s = skip + PAGE_SIZE; setSkip(s); load(status, s); }}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-white/15 px-3 py-1 hover:bg-slate-800 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-2 text-[11px] text-gray-600">
          Approving a conversion credits the publisher's wallet and writes an immutable audit log entry.
        </p>
      </div>
    </>
  );
}
