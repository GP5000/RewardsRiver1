// app/admin/fraud/page.tsx
"use client";

import { useEffect, useState } from "react";
import { ShieldAlert, ShieldOff, RefreshCw } from "lucide-react";

type FraudSignal = {
  type: string;
  entityId: string;
  entityLabel: string;
  count: number;
  lastSeen: string;
  details?: Record<string, any>;
};

type BlockedIp = {
  id: string;
  ip: string;
  reason: string | null;
  expiresAt: string | null;
  createdAt: string;
};

type FraudData = {
  signals: FraudSignal[];
  blockedIps: BlockedIp[];
};

const SIGNAL_LABELS: Record<string, string> = {
  ip_velocity: "IP velocity",
  cvr_anomaly: "CVR anomaly",
  ip_mismatch: "IP mismatch",
  subid_duplication: "Sub-ID duplication",
};

export default function AdminFraudPage() {
  const [data, setData] = useState<FraudData | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockIp, setBlockIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/fraud", { cache: "no-store" });
    const d = await res.json();
    if (d.ok) setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const doBlockIp = async () => {
    if (!blockIp.trim()) return;
    setBlocking(true);
    setError(null);
    const res = await fetch("/api/admin/fraud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "block_ip", ip: blockIp.trim(), reason: blockReason || undefined }),
    });
    const d = await res.json();
    setBlocking(false);
    if (!d.ok) { setError(d.error); return; }
    setBlockIp("");
    setBlockReason("");
    load();
  };

  const doUnblockIp = async (ip: string) => {
    await fetch("/api/admin/fraud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unblock_ip", ip }),
    });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Fraud Monitor</h1>
          <p className="mt-1 text-sm text-slate-400">Active fraud signals and blocked IPs.</p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900 px-3 py-2 text-xs text-gray-300 hover:border-cyan-400/50 transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Fraud signals */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
        <div className="border-b border-white/5 bg-slate-900/80 px-5 py-3 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Active signals</h2>
          <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-300">
            {data?.signals.length ?? 0}
          </span>
        </div>

        {!data?.signals.length ? (
          <p className="px-5 py-8 text-center text-xs text-gray-500">No fraud signals detected. All clear.</p>
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            <div className="hidden grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr] gap-4 border-b border-white/5 bg-slate-900/50 px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
              <span>Signal type</span>
              <span>Entity</span>
              <span className="text-right">Count</span>
              <span className="text-right">Last seen</span>
              <span />
            </div>
            {data.signals.map((s, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 px-5 py-3 hover:bg-slate-900/30 sm:grid-cols-[1.5fr_1.5fr_1fr_1fr_1fr] sm:items-center sm:gap-4">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-amber-200">{SIGNAL_LABELS[s.type] ?? s.type}</span>
                </span>
                <span className="font-mono text-xs text-gray-300 truncate">{s.entityLabel}</span>
                <span className="text-right text-gray-300">{s.count}</span>
                <span className="text-right text-[11px] text-gray-500">{new Date(s.lastSeen).toLocaleDateString()}</span>
                {s.type === "ip_velocity" && (
                  <button
                    onClick={() => { setBlockIp(s.entityLabel); }}
                    className="text-right text-xs text-rose-400 hover:text-rose-300"
                  >
                    Block IP
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block IP form */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldOff className="h-4 w-4 text-rose-400" />
          Block an IP address
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={blockIp}
            onChange={(e) => setBlockIp(e.target.value)}
            placeholder="IP address (e.g. 1.2.3.4)"
            className="flex-1 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-rose-500 font-mono"
          />
          <input
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="Reason (optional)"
            className="flex-1 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-rose-500"
          />
          <button
            onClick={doBlockIp}
            disabled={blocking || !blockIp.trim()}
            className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition"
          >
            {blocking ? "Blocking…" : "Block IP"}
          </button>
        </div>
        {error && <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">{error}</div>}
      </div>

      {/* Blocked IPs */}
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
        <div className="border-b border-white/5 bg-slate-900/80 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Blocked IPs</h2>
        </div>
        {!data?.blockedIps.length ? (
          <p className="px-5 py-6 text-center text-xs text-gray-500">No blocked IPs.</p>
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            {data.blockedIps.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-900/30">
                <div>
                  <span className="font-mono text-sm text-gray-100">{b.ip}</span>
                  {b.reason && <p className="text-[11px] text-gray-500">{b.reason}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-gray-500">{new Date(b.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => doUnblockIp(b.ip)}
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                  >
                    Unblock
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
