import Link from "next/link";
import { ExternalNavbar } from "@/components/ExternalNavbar";


export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0C1220] text-slate-50">
      {/* ---------- Top gradient + glow background ---------- */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-[-10rem] flex justify-center blur-3xl">
          <div className="aspect-[1108/632] w-full max-w-5xl bg-gradient-to-tr from-sky-900/40 via-cyan-400/15 to-indigo-500/25 opacity-80" />
        </div>
        <div className="absolute inset-x-0 bottom-[-16rem] flex justify-center blur-3xl">
          <div className="aspect-[1200/600] w-full max-w-4xl bg-gradient-to-tr from-sky-500/15 via-cyan-500/15 to-indigo-500/20 opacity-60" />
        </div>
      </div>

      {/* ---------- Navbar (shared component) ---------- */}
      <ExternalNavbar />

      {/* ---------- Hero Section ---------- */}
      <section className="border-b border-sky-500/10 bg-gradient-to-b from-sky-950/30 via-[#0C1220] to-[#0C1220]">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:pb-20">
          {/* Left text column */}
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium text-emerald-200">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Next-gen offerwall & monetization stack
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
              Turn your traffic into a{" "}
              <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">
                revenue river.
              </span>
            </h1>

            <p className="text-sm leading-relaxed text-slate-300 sm:text-[15px]">
              RewardsRiver gives apps, games, and reward sites a plug-and-play
              offerwall, real-time analytics, and trusted payouts – all in one
              dashboard. Drop in a placement, connect offers, and start
              monetizing in minutes.
            </p>

            <div className="flex flex-col gap-3 text-xs text-slate-200 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-300">
                  ✓
                </div>
                <span>Embed-ready offerwall widget</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-300">
                  ✓
                </div>
                <span>Live stats, EPC & conversion data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] text-emerald-300">
                  ✓
                </div>
                <span>Publisher-friendly rev share</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
              <Link
                href="/publisher/register"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:brightness-110"
              >
                Start as a Publisher
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-black/40 px-4 py-2 text-xs font-medium text-slate-100 hover:border-emerald-500 hover:text-emerald-300"
              >
                View dashboard demo
              </Link>
            </div>

            <p className="text-[11px] text-slate-500">
              RewardsRiver is built for real publishers – not just another
              reskinned rewards site. You own your placements, your users, and
              your revenue.
            </p>
          </div>

          {/* Right "dashboard" preview card */}
          <div
            id="demo"
            className="relative mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950/95 via-slate-950 to-slate-900/90 p-4 shadow-2xl shadow-emerald-900/50"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Publisher Dashboard
                </span>
                <span className="text-xs text-slate-300">
                  Live overview & placement stats
                </span>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-300">
                Demo View
              </span>
            </div>

            <div className="space-y-3">
              {/* Top metrics row */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] text-slate-400">Revenue (7d)</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-400">
                    $482.36
                  </p>
                  <p className="text-[10px] text-emerald-300/70">
                    +23.4% vs prior
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] text-slate-400">Conversions</p>
                  <p className="mt-1 text-sm font-semibold text-sky-400">
                    1,284
                  </p>
                  <p className="text-[10px] text-sky-300/70">CR 12.9%</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] text-slate-400">EPC</p>
                  <p className="mt-1 text-sm font-semibold text-cyan-300">
                    $0.34
                  </p>
                  <p className="text-[10px] text-cyan-300/70">Global blended</p>
                </div>
              </div>

              {/* Tiny chart placeholder */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">Revenue trend (7d)</span>
                  <span className="text-slate-500">UTC</span>
                </div>
                <div className="mt-2 h-20 rounded-lg bg-[radial-gradient(circle_at_0_0,rgba(45,212,191,0.3),transparent_55%),radial-gradient(circle_at_100%_100%,rgba(56,189,248,0.35),transparent_55%)]" />
              </div>

              {/* Placements table preview */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Top placements</span>
                  <span className="text-slate-500">Last 24h</span>
                </div>
                <div className="space-y-2 text-[11px]">
                  {[
                    {
                      name: "RewardsWall – Mobile",
                      clicks: 942,
                      conv: 138,
                      epc: 0.42,
                    },
                    {
                      name: "Desktop Offerwall",
                      clicks: 611,
                      conv: 71,
                      epc: 0.31,
                    },
                    {
                      name: "Survey Hub – Global",
                      clicks: 388,
                      conv: 52,
                      epc: 0.36,
                    },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1.5"
                    >
                      <div className="flex flex-col">
                        <span className="max-w-[150px] truncate text-[11px] text-slate-100">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {p.clicks} clicks · {p.conv} conv · EPC $
                          {p.epc.toFixed(2)}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Demo data shown. Live dashboards update continuously as your
                users click and convert across placements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <div className="relative -mt-1 overflow-hidden leading-none bg-[#0C1220]" aria-hidden="true">
        <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className="w-full h-12 animate-wave-slow" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 30 Q150 0 300 30 Q450 60 600 30 Q750 0 900 30 Q1050 60 1200 30 L1200 60 L0 60 Z" fill="rgba(14,165,233,0.06)" />
          <path d="M0 40 Q200 10 400 40 Q600 70 800 40 Q1000 10 1200 40 L1200 60 L0 60 Z" fill="rgba(6,182,212,0.04)" />
        </svg>
      </div>

      {/* ---------- For Publishers ---------- */}
      <section
        id="publishers"
        className="border-b border-sky-500/10 bg-[#0C1220]"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-slate-50">
                Built for serious publishers.
              </h2>
              <p className="text-sm text-slate-300">
                Whether you run a GPT site, mobile app, game, or community,
                RewardsRiver gives you a dedicated offerwall, not just a generic
                iframe.
              </p>
              <p className="text-xs text-slate-400">
                Our stack is optimized for transparency, control, and long-term
                revenue — not quick, disposable traffic.
              </p>
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs">
                <h3 className="mb-1 text-[13px] font-semibold text-slate-50">
                  Plug-and-play offerwall
                </h3>
                <p className="text-slate-300">
                  Generate a placement, drop the widget on your site, and start
                  monetizing. We handle click tracking, conversions, and
                  routing.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs">
                <h3 className="mb-1 text-[13px] font-semibold text-slate-50">
                  Real-time analytics
                </h3>
                <p className="text-slate-300">
                  See EPC, CR, geo split, and placement performance in real
                  time. No more flying blind with “black box” networks.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs">
                <h3 className="mb-1 text-[13px] font-semibold text-slate-50">
                  Payouts that make sense
                </h3>
                <p className="text-slate-300">
                  Clear reporting of earnings, pending, and paid amounts. We
                  design rev share to be competitive and transparent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- For Advertisers ---------- */}
      <section
        id="advertisers"
        className="border-b border-sky-500/10 bg-slate-950/60"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1.3fr,1fr] md:items-center">
            <div className="space-y-3">
              <h2 className="text-xl font-semibold tracking-tight text-slate-50">
                Quality inventory for performance advertisers.
              </h2>
              <p className="text-sm text-slate-300">
                RewardsRiver is a curated monetization layer, not a blind
                traffic dump. We work with vetted publishers who care about
                user experience and long-term earnings.
              </p>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• GDPR-aware tracking & postback setup</li>
                <li>• Offerwall / survey / app install funnels</li>
                <li>• Transparent reporting and fraud controls</li>
                <li>• Deep integrations with leading networks</li>
              </ul>
              <p className="pt-1 text-xs text-slate-500">
                Advertisers get full visibility into placements, traffic
                sources, and KPIs — with no hidden layers between you and the
                user.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-[1px]">
              <div className="h-full rounded-2xl bg-slate-950/95 p-4 text-xs">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                  Example Offerwall Widget
                </p>
                <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/90 p-2">
                  {[
                    {
                      name: "Install & open finance app",
                      payout: 2.1,
                      geo: "US, CA, UK",
                    },
                    {
                      name: "Complete paid survey",
                      payout: 0.75,
                      geo: "Tier 1 + EU",
                    },
                    {
                      name: "Reach level 20 in RPG game",
                      payout: 8.5,
                      geo: "Global",
                    },
                  ].map((o) => (
                    <div
                      key={o.name}
                      className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-[11px] text-slate-100">
                          {o.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {o.geo}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                        ${o.payout.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Widgets are fully branded for each publisher but powered by a
                  common tracking & risk layer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section
        id="how-it-works"
        className="border-b border-sky-500/10 bg-[#0C1220]"
      >
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-50">
                How RewardsRiver works.
              </h2>
              <p className="text-sm text-slate-300">
                From integration to payouts, the flow is simple and predictable
                for both publishers and advertisers.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Publishers flow */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                For Publishers
              </p>
              <ol className="space-y-3">
                <li>
                  <span className="font-semibold text-slate-100">
                    1. Create a placement
                  </span>
                  <p className="text-slate-300">
                    Generate an offerwall placement from your dashboard for web,
                    Android, or iOS.
                  </p>
                </li>
                <li>
                  <span className="font-semibold text-slate-100">
                    2. Embed the widget
                  </span>
                  <p className="text-slate-300">
                    Drop in our iframe or JS widget and pass user identifiers
                    (user ID, session, or sub ID).
                  </p>
                </li>
                <li>
                  <span className="font-semibold text-slate-100">
                    3. Track earnings in real time
                  </span>
                  <p className="text-slate-300">
                    Watch clicks, conversions, EPC, and revenue update across
                    placements, geos, and devices.
                  </p>
                </li>
              </ol>
            </div>

            {/* Advertisers flow */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                For Advertisers & Networks
              </p>
              <ol className="space-y-3">
                <li>
                  <span className="font-semibold text-slate-100">
                    1. Connect your offers
                  </span>
                  <p className="text-slate-300">
                    Plug in your existing offer feed, postback rules, and
                    targeting. We support standard S2S flows.
                  </p>
                </li>
                <li>
                  <span className="font-semibold text-slate-100">
                    2. Monitor performance
                  </span>
                  <p className="text-slate-300">
                    See how placements and geos perform, and adjust payouts or
                    caps as needed.
                  </p>
                </li>
                <li>
                  <span className="font-semibold text-slate-100">
                    3. Scale what works
                  </span>
                  <p className="text-slate-300">
                    Reward quality publishers, cut low-quality placements, and
                    push budgets into the best traffic.
                  </p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="bg-gradient-to-b from-sky-950/20 to-[#0C1220]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-lg font-semibold tracking-tight text-slate-50 sm:text-xl">
              Ready to turn your users into a new revenue stream?
            </h2>
            <p className="max-w-xl text-sm text-slate-300">
              Connect your app, site, or reward platform to RewardsRiver and
              unlock a dedicated offerwall with transparent analytics and
              publisher-first payouts.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/publisher/register"
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-2.5 text-xs font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:brightness-110"
              >
                Apply as a Publisher
              </Link>
              <Link
                href="/advertiser/register"
                className="inline-flex items-center justify-center rounded-xl border border-sky-700/60 bg-sky-950/30 px-5 py-2.5 text-xs font-medium text-slate-100 hover:border-sky-400 hover:text-sky-300"
              >
                Register as an Advertiser
              </Link>
            </div>
            <p className="text-[11px] text-slate-500">
              Early-stage partners get priority support and direct input into
              our roadmap.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-sky-500/10 bg-slate-950/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-4 text-[11px] text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} RewardsRiver. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-sky-300">Privacy</Link>
            <Link href="/terms" className="hover:text-sky-300">Terms</Link>
            <Link href="/publisher/login" className="hover:text-sky-300">Publisher Login</Link>
            <Link href="/advertiser/login" className="hover:text-sky-300">Advertiser Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
