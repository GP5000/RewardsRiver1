"use client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Globe2,
  Smartphone,
  Filter,
  X,
  Search,
  DollarSign,
  ArrowRight,
  BarChart3,
  ListFilter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */

type Offer = {
  id: string;
  name: string;
  payoutUsd: number;
  epcUsd: number;
  crPct: number;
  image?: string;
  geo: string[];
  devices: string[];
  category: string;
};

type OffersResponse = {
  offers: Offer[];
};

/* ─────────────────────────────────────────────────────────────
   Components: Loading + Modal + Toast
   ───────────────────────────────────────────────────────────── */

function LocalLoadingOverlay({
  show,
}: {
  show: boolean;
}) {
  return (
    <div
      aria-hidden={!show}
      aria-busy={show}
      role="status"
      className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white shadow-xl"
      >
        Loading...
      </motion.div>
    </div>
  );
}

type OfferModalProps = {
  offer: Offer | null;
  onClose: () => void;
};

function OfferDetailsModal({ offer, onClose }: OfferModalProps) {
  if (!offer) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl"
        >
          <h2 className="text-xl font-semibold">{offer.name}</h2>

          <div className="mt-4 space-y-2 text-sm text-gray-300">
            <p>Payout: ${offer.payoutUsd.toFixed(2)}</p>
            <p>EPC: ${offer.epcUsd.toFixed(3)}</p>
            <p>CR: {offer.crPct.toFixed(1)}%</p>
            <p>Category: {offer.category}</p>

            <p>
              GEO:{" "}
              {offer.geo.length
                ? offer.geo.join(", ")
                : "All"}
            </p>

            <p>
              Devices:{" "}
              {offer.devices.length
                ? offer.devices.join(", ")
                : "All"}
            </p>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/20 px-4 py-1.5 text-sm text-gray-300 transition hover:bg-white/10"
            >
              Close
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/wall?offer=${offer.id}`
                );
              }}
              className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-medium text-black hover:bg-cyan-400"
            >
              Copy Tracking Link
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────
   Page
   ───────────────────────────────────────────────────────────── */

function OffersExplorerPageInner() {
  const searchParams = useSearchParams();
  const publisherId = searchParams.get("publisherId");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [geoFilter, setGeo] = useState("");
  const [deviceFilter, setDevice] = useState("");
  const [categoryFilter, setCategory] = useState("");
  const [sort, setSort] = useState("");

  useEffect(() => {
    if (!publisherId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/publisher/offers?publisherId=${publisherId}`,
          { cache: "no-store" }
        );
        const data: OffersResponse = await res.json();
        setOffers(data.offers);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [publisherId]);

  const filtered = useMemo(() => {
    return offers
      .filter((offer) => {
        if (query && !offer.name.toLowerCase().includes(query.toLowerCase()))
          return false;
        if (geoFilter && !offer.geo.includes(geoFilter)) return false;
        if (deviceFilter && !offer.devices.includes(deviceFilter)) return false;
        if (categoryFilter && offer.category !== categoryFilter) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sort) {
          case "epc":
            return b.epcUsd - a.epcUsd;
          case "payout":
            return b.payoutUsd - a.payoutUsd;
          case "newest":
            return b.id.localeCompare(a.id);
          default:
            return 0;
        }
      });
  }, [offers, query, geoFilter, deviceFilter, categoryFilter, sort]);

  return (
    <>
      <LocalLoadingOverlay show={loading} />
      <OfferDetailsModal
        offer={activeOffer}
        onClose={() => setActiveOffer(null)}
      />

      <div className="mx-auto max-w-6xl pb-12">
        <h1 className="mt-2 bg-gradient-to-r from-cyan-300 via-sky-400 to-indigo-400 bg-clip-text text-2xl font-semibold text-transparent">
          Offers Explorer
        </h1>

        {/* Filters */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-5 text-sm">
            <div className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-gray-200">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                placeholder="Search offers..."
                className="w-full bg-transparent outline-none placeholder:text-gray-500"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <select
              value={geoFilter}
              onChange={(e) => setGeo(e.target.value)}
              className="rounded-lg bg-slate-900 px-3 py-2 outline-none text-gray-200"
            >
              <option value="">All GEO</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
            </select>

            <select
              value={deviceFilter}
              onChange={(e) => setDevice(e.target.value)}
              className="rounded-lg bg-slate-900 px-3 py-2 outline-none text-gray-200"
            >
              <option value="">All Devices</option>
              <option value="iOS">iOS</option>
              <option value="Android">Android</option>
              <option value="Desktop">Desktop</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg bg-slate-900 px-3 py-2 outline-none text-gray-200"
            >
              <option value="">All Categories</option>
              <option value="Survey">Survey</option>
              <option value="App Install">App Install</option>
              <option value="Registration">Registration</option>
              <option value="Crypto">Crypto</option>
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-lg bg-slate-900 px-3 py-2 outline-none text-gray-200"
            >
              <option value="">Sort By</option>
              <option value="epc">Highest EPC</option>
              <option value="payout">Highest Payout</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Offers Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((offer) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="cursor-pointer rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur transition hover:border-cyan-400/30 hover:bg-slate-900"
              onClick={() => setActiveOffer(offer)}
            >
              <h3 className="text-lg font-medium text-white">{offer.name}</h3>

              <p className="mt-1 text-xs text-gray-400">
                {offer.category} · {offer.geo.join(", ")}
              </p>

              <div className="mt-4 flex justify-between text-sm text-gray-300">
                <div>
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">
                    Payout
                  </span>
                  <p className="text-white font-semibold">
                    ${offer.payoutUsd.toFixed(2)}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">
                    EPC
                  </span>
                  <p className="text-white font-semibold">
                    ${offer.epcUsd.toFixed(3)}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] uppercase tracking-wide text-gray-400">
                    CR
                  </span>
                  <p className="text-white font-semibold">
                    {offer.crPct.toFixed(1)}%
                  </p>
                </div>
              </div>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full mt-6 rounded-xl border border-white/10 bg-slate-950/70 p-6 text-center text-gray-400">
              No offers match your filters.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function OffersExplorerPage() {
  return (
    <Suspense>
      <OffersExplorerPageInner />
    </Suspense>
  );
}
