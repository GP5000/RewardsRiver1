// app/admin/advertisers/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Advertiser = {
  id: string;
  companyName: string;
  contactEmail: string | null;
  websiteUrl: string | null;
  status: string;
  createdAt: string;
  user: { id: string | null; name: string | null; email: string | null } | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  suspended: "bg-red-500/15 text-red-300 border-red-500/30",
};

const FILTERS = ["all", "pending", "active", "suspended"];

export default function AdminAdvertisersPage() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = async (status: string) => {
    setLoading(true);
    const qs = status !== "all" ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/advertisers${qs}`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setAdvertisers(data.advertisers);
    setLoading(false);
  };

  useEffect(() => { load(filter); }, [filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Advertisers</h1>
        <p className="mt-1 text-sm text-slate-400">Manage advertiser accounts.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition capitalize ${
              filter === f
                ? "border-cyan-400/80 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-slate-900/70 text-gray-300 hover:border-cyan-400/50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : advertisers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-slate-400">
          No advertisers found.
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-slate-950/80">
          <div className="hidden grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 border-b border-white/5 bg-slate-900/80 px-5 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400 sm:grid">
            <span>Company</span>
            <span>Contact</span>
            <span>Status</span>
            <span>Joined</span>
            <span />
          </div>
          <div className="divide-y divide-white/5">
            {advertisers.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-slate-900/30 sm:grid-cols-[2fr_1.5fr_1fr_1fr_auto] sm:items-center sm:gap-4"
              >
                <div>
                  <Link href={`/admin/advertisers/${a.id}`} className="text-sm font-medium text-slate-100 hover:text-cyan-300 transition">
                    {a.companyName}
                  </Link>
                  {a.websiteUrl && <p className="text-[11px] text-gray-500 truncate">{a.websiteUrl}</p>}
                </div>
                <div className="text-sm text-gray-300">
                  {a.user?.name ?? "—"}
                  {a.contactEmail && <p className="text-[11px] text-gray-500">{a.contactEmail}</p>}
                </div>
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_BADGE[a.status] ?? STATUS_BADGE.pending}`}>
                  {a.status}
                </span>
                <span className="text-[11px] text-gray-500">
                  {new Date(a.createdAt).toLocaleDateString()}
                </span>
                <Link
                  href={`/admin/advertisers/${a.id}`}
                  className="rounded-lg border border-white/10 bg-slate-900 p-1.5 text-gray-400 hover:text-cyan-300 hover:border-cyan-400/40 transition"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
