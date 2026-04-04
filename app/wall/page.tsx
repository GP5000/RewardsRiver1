// app/wall/page.tsx
"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Clock, XCircle } from "lucide-react";

/* ─── Types ─── */

type DeviceTarget = "all" | "desktop" | "mobile";

type WallOffer = {
  id: string;
  title?: string;
  payoutUsd: number;
  estMinutes?: number | null;
  network?: string | null;
  category?: string | null;
  description?: string | null;
  badge?: string | null;
  trackingUrl: string;
  imageUrl?: string | null;
  deviceTarget?: DeviceTarget;
  stats?: { clicks?: number; conversions?: number; epcUsd?: number };
};

type WallPlacement = {
  id: string;
  name: string;
  appName?: string | null;
  geo?: string | null;
};

type WallResponse = {
  ok: boolean;
  placement: WallPlacement;
  offers: WallOffer[];
};

type UserConversion = {
  id: string;
  conversionStatus: "pending" | "approved" | "rejected" | "paid";
  payoutUsd: number;
  rejectionReason: string | null;
  offer: {
    id: string;
    name: string;
    imageUrl: string | null;
    category: string | null;
  } | null;
  createdAt: string;
};

type SortMode = "popular" | "highest" | "fastest";
type WallTab = "offers" | "pending" | "completed";

/* ─── Helpers ─── */

function formatMinutes(m?: number | null) {
  if (!m || m <= 0) return null;
  if (m < 5) return "<5 min";
  if (m <= 60) return `${m} min`;
  return `${Math.round(m / 60)}h`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-950/80 overflow-hidden animate-pulse">
      <div className="aspect-video bg-slate-900/80" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-2/3 rounded bg-slate-800" />
        <div className="h-2.5 w-1/2 rounded bg-slate-800/70" />
        <div className="h-8 w-full rounded-full bg-slate-800 mt-4" />
      </div>
    </div>
  );
}

/* ─── Wave SVG empty state ─── */
function WaveEmptyState({ message = "No offers available right now", sub = "Check back soon — new offers are added regularly." }: { message?: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <svg viewBox="0 0 200 80" className="mb-4 w-48 opacity-30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 40 Q25 20 50 40 Q75 60 100 40 Q125 20 150 40 Q175 60 200 40" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" />
        <path d="M0 55 Q25 35 50 55 Q75 75 100 55 Q125 35 150 55 Q175 75 200 55" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </svg>
      <p className="text-sm font-medium text-gray-400">{message}</p>
      <p className="mt-1 text-xs text-gray-600">{sub}</p>
    </div>
  );
}

/* ─── Offer card ─── */
function OfferCard({ offer }: { offer: WallOffer }) {
  const title = offer.title || "Offer";
  const initial = title.charAt(0).toUpperCase();
  const estTime = formatMinutes(offer.estMinutes);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-lg hover:border-sky-500/40 hover:shadow-sky-500/10 transition-all duration-200">
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={offer.imageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-sky-500/40">
            {initial}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/80 to-transparent" />
        <div className="absolute top-2.5 right-2.5 rounded-full border border-emerald-400/50 bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300 shadow backdrop-blur-sm">
          +${offer.payoutUsd.toFixed(2)}
        </div>
        {offer.category && (
          <div className="absolute top-2.5 left-2.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300 backdrop-blur-sm">
            {offer.category}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="line-clamp-2 text-sm font-semibold text-slate-100 leading-snug">{title}</h2>
        {offer.description && (
          <p className="line-clamp-2 text-[11px] text-gray-400 leading-relaxed">{offer.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {offer.badge && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              {offer.badge}
            </span>
          )}
          {estTime && (
            <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-[10px] text-gray-400">
              ⚡ {estTime}
            </span>
          )}
          {offer.network && (
            <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-[10px] text-gray-500">
              {offer.network}
            </span>
          )}
        </div>
        <div className="mt-auto pt-3">
          <a
            href={offer.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-sky-500/30 transition hover:brightness-110 active:scale-[0.98]"
          >
            Start earning →
          </a>
        </div>
      </div>
    </article>
  );
}

/* ─── Conversion row (pending + completed tabs) ─── */
function ConversionRow({ c }: { c: UserConversion }) {
  const isPending = c.conversionStatus === "pending";
  const isRejected = c.conversionStatus === "rejected";
  const isDone = c.conversionStatus === "approved" || c.conversionStatus === "paid";
  const title = c.offer?.name ?? "Offer";
  const initial = title.charAt(0).toUpperCase();

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
      isRejected
        ? "border-rose-500/20 bg-rose-950/20"
        : isDone
        ? "border-emerald-500/20 bg-emerald-950/10"
        : "border-white/10 bg-slate-900/50"
    }`}>
      {/* Thumbnail */}
      <div className="relative mt-0.5 h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-800">
        {c.offer?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.offer.imageUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-sky-500/40">
            {initial}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-0.5 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-100">{title}</p>
          <span className="flex-shrink-0 text-xs font-semibold text-emerald-400">
            +${c.payoutUsd.toFixed(2)}
          </span>
        </div>

        {c.offer?.category && (
          <span className="text-[10px] text-gray-500">{c.offer.category}</span>
        )}

        {/* Status line */}
        <div className="mt-1 flex items-center gap-1.5">
          {isPending && (
            <>
              <Clock className="h-3 w-3 flex-shrink-0 text-amber-400" />
              <span className="text-[11px] text-amber-300">Under review</span>
            </>
          )}
          {isRejected && (
            <>
              <XCircle className="h-3 w-3 flex-shrink-0 text-rose-400" />
              <span className="text-[11px] text-rose-300">Not approved</span>
            </>
          )}
          {isDone && (
            <>
              <CheckCircle className="h-3 w-3 flex-shrink-0 text-emerald-400" />
              <span className="text-[11px] text-emerald-300">
                {c.conversionStatus === "paid" ? "Paid out" : "Reward approved"}
              </span>
            </>
          )}
          <span className="ml-auto flex-shrink-0 text-[10px] text-gray-600">
            {timeAgo(c.createdAt)}
          </span>
        </div>

        {/* Rejection reason */}
        {isRejected && c.rejectionReason && (
          <p className="mt-1 rounded-lg bg-rose-950/40 px-2 py-1.5 text-[11px] leading-relaxed text-rose-300/80">
            {c.rejectionReason}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── No subId warning ─── */
function NoSubIdNotice() {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Clock className="mb-3 h-8 w-8 text-gray-600" />
      <p className="text-sm font-medium text-gray-400">No user ID provided</p>
      <p className="mt-1 text-xs text-gray-600 max-w-xs">
        Your activity history isn't available in this session. Contact support if you believe this is an error.
      </p>
    </div>
  );
}

/* ─── Main page ─── */

const WallPage: React.FC = () => {
  const searchParams = useSearchParams();

  const [wall, setWall] = useState<WallResponse | null>(null);
  const [wallLoading, setWallLoading] = useState(true);
  const [wallError, setWallError] = useState<string | null>(null);

  const [conversions, setConversions] = useState<UserConversion[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);

  const [subId, setSubId] = useState<string | null>(null);
  const [placementId, setPlacementId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<WallTab>("offers");
  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const hasFetchedRef = useRef(false);
  const impressionSentRef = useRef(false);

  /* Auto-resize for iframe embed */
  useEffect(() => {
    const sendHeight = () => {
      try {
        const height = document.documentElement.scrollHeight || document.body.scrollHeight || 600;
        window.parent?.postMessage({ type: "rewardsriver:wall-height", height }, "*");
      } catch { /* ignore */ }
    };
    sendHeight();
    const ro = new ResizeObserver(() => sendHeight());
    ro.observe(document.body);
    window.addEventListener("load", sendHeight);
    return () => { ro.disconnect(); window.removeEventListener("load", sendHeight); };
  }, []);

  /* Load offers */
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const pid = searchParams.get("placement_id") ?? searchParams.get("pub");
    const sub = searchParams.get("sub_id") ?? searchParams.get("uid");
    setSubId(sub);
    setPlacementId(pid);

    if (!pid) {
      setWallError("Missing placement_id in URL.");
      setWallLoading(false);
      return;
    }

    const controller = new AbortController();
    const qs = new URLSearchParams();
    qs.set("placement_id", pid);
    if (sub) qs.set("sub_id", sub);
    for (const [k, v] of searchParams.entries()) {
      if (!["placement_id", "pub", "sub_id", "uid"].includes(k)) qs.set(k, v);
    }

    (async () => {
      try {
        const res = await fetch(`/api/wall?${qs.toString()}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: WallResponse = await res.json();
        if (!data.ok) throw new Error("Offerwall unavailable.");
        setWall(data);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setWallError(err?.message ?? "Unable to load offers.");
      } finally {
        setWallLoading(false);
      }
    })();

    return () => controller.abort();
  }, [searchParams]);

  /* Impression tracking */
  useEffect(() => {
    if (!wall || impressionSentRef.current) return;
    impressionSentRef.current = true;
    fetch("/api/wall/impression", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placementId: wall.placement.id, subId: subId ?? undefined }),
    }).catch(() => {});
  }, [wall, subId]);

  /* Load conversions when switching to Pending or Completed tab */
  useEffect(() => {
    if (activeTab === "offers" || !subId) return;

    let cancelled = false;
    setConvsLoading(true);

    const qs = new URLSearchParams({ sub_id: subId });
    if (placementId) qs.set("placement_id", placementId);

    fetch(`/api/wall/conversions?${qs.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setConversions(data.conversions ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setConvsLoading(false); });

    return () => { cancelled = true; };
  }, [activeTab, subId, placementId]);

  /* Derived lists */
  const pendingConversions = useMemo(
    () => conversions.filter((c) => c.conversionStatus === "pending" || c.conversionStatus === "rejected"),
    [conversions]
  );

  const completedConversions = useMemo(
    () => conversions.filter((c) => c.conversionStatus === "approved" || c.conversionStatus === "paid"),
    [conversions]
  );

  /* Category list */
  const categories = useMemo(() => {
    if (!wall) return ["All"];
    const cats = new Set<string>();
    for (const o of wall.offers) if (o.category) cats.add(o.category);
    return ["All", ...Array.from(cats).sort()];
  }, [wall]);

  /* Filter + sort offers */
  const visibleOffers = useMemo(() => {
    if (!wall) return [];
    let base = [...wall.offers];
    if (activeCategory !== "All") base = base.filter((o) => o.category === activeCategory);
    switch (sortMode) {
      case "popular":
        return base.sort((a, b) => {
          const diff = (b.stats?.conversions ?? 0) - (a.stats?.conversions ?? 0);
          return diff !== 0 ? diff : b.payoutUsd - a.payoutUsd;
        });
      case "highest":
        return base.sort((a, b) => b.payoutUsd - a.payoutUsd);
      case "fastest":
        return base.sort((a, b) => (a.estMinutes ?? 999999) - (b.estMinutes ?? 999999));
    }
  }, [wall, activeCategory, sortMode]);

  const placementName = wall?.placement?.name ?? "RewardsRiver";

  /* Tab badge counts (pending + rejected combined) */
  const pendingCount = pendingConversions.length;
  const completedCount = completedConversions.length;

  return (
    <div className="min-h-screen bg-[#0C1220] text-slate-100">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-sky-500/10 blur-3xl" style={{ willChange: "transform" }} />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Header */}
        <header className="mb-5 rounded-2xl border border-sky-500/20 bg-white/[0.03] px-5 py-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400/70">RewardsRiver</p>
              <h1 className="mt-1 bg-gradient-to-r from-sky-300 via-cyan-400 to-indigo-400 bg-clip-text text-xl font-semibold tracking-tight text-transparent sm:text-2xl">
                {placementName} Offers
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                Complete offers to earn rewards · {wall?.offers.length ?? 0} offers available
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-medium text-emerald-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative rounded-full bg-emerald-400" />
              </span>
              Live
            </span>
          </div>
        </header>

        {/* Main tabs: Offers / Pending / Completed */}
        <div className="mb-5 flex items-center gap-1 rounded-xl border border-white/10 bg-slate-950/70 p-1 w-fit">
          {(
            [
              { id: "offers" as WallTab, label: "Offers" },
              { id: "pending" as WallTab, label: "Pending", count: subId ? pendingCount : null },
              { id: "completed" as WallTab, label: "Completed", count: subId ? completedCount : null },
            ] as { id: WallTab; label: string; count?: number | null }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "bg-sky-500 text-slate-950"
                  : "text-gray-400 hover:bg-slate-800 hover:text-gray-100"
              }`}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                    activeTab === tab.id
                      ? "bg-slate-950/30 text-slate-900"
                      : "bg-slate-700 text-gray-300"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OFFERS TAB ── */}
        {activeTab === "offers" && (
          <>
            {/* Category + sort controls */}
            {!wallLoading && !wallError && wall && wall.offers.length > 0 && (
              <div className="mb-5 space-y-3">
                {categories.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                          activeCategory === cat
                            ? "border-sky-400/80 bg-sky-400/10 text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                            : "border-white/10 bg-slate-900/60 text-gray-400 hover:border-sky-400/50 hover:text-gray-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-gray-600">Sort:</span>
                  {(["popular", "highest", "fastest"] as SortMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setSortMode(mode)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-medium transition capitalize ${
                        sortMode === mode
                          ? "border-cyan-400/70 bg-cyan-400/10 text-cyan-300"
                          : "border-white/10 bg-slate-900/50 text-gray-500 hover:border-cyan-400/40 hover:text-gray-300"
                      }`}
                    >
                      {mode === "popular" ? "⭐ Popular" : mode === "highest" ? "💰 Highest" : "⚡ Fastest"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wallError && (
              <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">
                {wallError}
              </div>
            )}

            {wallLoading && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            )}

            {!wallLoading && !wallError && wall && visibleOffers.length === 0 && <WaveEmptyState />}

            {!wallLoading && !wallError && visibleOffers.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleOffers.map((offer) => <OfferCard key={offer.id} offer={offer} />)}
              </div>
            )}
          </>
        )}

        {/* ── PENDING TAB ── */}
        {activeTab === "pending" && (
          <>
            {!subId && <NoSubIdNotice />}

            {subId && convsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-slate-900/50" />
                ))}
              </div>
            )}

            {subId && !convsLoading && pendingConversions.length === 0 && (
              <WaveEmptyState
                message="No pending activity"
                sub="Offers you've started will appear here while they're being reviewed."
              />
            )}

            {subId && !convsLoading && pendingConversions.length > 0 && (
              <div className="space-y-2">
                <p className="mb-3 text-[11px] text-gray-600">
                  Offers under review · Rejected entries show the reason below.
                </p>
                {pendingConversions.map((c) => (
                  <ConversionRow key={c.id} c={c} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── COMPLETED TAB ── */}
        {activeTab === "completed" && (
          <>
            {!subId && <NoSubIdNotice />}

            {subId && convsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-slate-900/50" />
                ))}
              </div>
            )}

            {subId && !convsLoading && completedConversions.length === 0 && (
              <WaveEmptyState
                message="No completed offers yet"
                sub="Approved rewards will appear here once verified."
              />
            )}

            {subId && !convsLoading && completedConversions.length > 0 && (
              <div className="space-y-2">
                <p className="mb-3 text-[11px] text-gray-600">
                  Approved rewards · {completedConversions.reduce((sum, c) => sum + c.payoutUsd, 0).toFixed(2)} USD total earned
                </p>
                {completedConversions.map((c) => (
                  <ConversionRow key={c.id} c={c} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-10 border-t border-white/5 pt-4">
          <p className="text-[10px] text-gray-700 leading-relaxed">
            By participating, you agree to complete offers honestly. Fraudulent activity may result in reversed rewards and account restrictions. Powered by RewardsRiver.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default WallPage;
