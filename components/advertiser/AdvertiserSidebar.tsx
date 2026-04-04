// components/advertiser/AdvertiserSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  CreditCard,
  Settings,
  X,
  Menu,
} from "lucide-react";

const LINKS = [
  { href: "/advertiser/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/advertiser/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/advertiser/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/advertiser/billing", label: "Billing", icon: CreditCard },
  { href: "/advertiser/settings", label: "Settings", icon: Settings },
];

type Props = { mobileOpen?: boolean; onClose?: () => void };

export function AdvertiserSidebar({ mobileOpen = false, onClose = () => {} }: Props) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/" });
  }

  const NavList = (
    <nav className="mt-4 space-y-1 text-sm">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/advertiser/dashboard" && pathname?.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
              active
                ? "bg-sky-500/15 text-sky-300"
                : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            {active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const LogoutBtn = (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-500/80 hover:bg-rose-900/60 hover:text-rose-50 disabled:opacity-60"
    >
      {loggingOut ? "Logging out…" : "Log out"}
    </button>
  );

  const Brand = (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400/80">RewardsRiver</p>
      <h2 className="mt-1 text-sm font-semibold text-slate-50">Advertiser</h2>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-950/90 px-4 py-6 lg:flex">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-sm font-bold text-slate-950">
            RR
          </div>
          {Brand}
        </div>
        {NavList}
        <div className="mt-auto pt-6">
          <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">Session</p>
          {LogoutBtn}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!mobileOpen}
      >
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/60 transition-opacity ${mobileOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-full border-r border-slate-800 bg-slate-950/95 px-4 py-6 shadow-2xl transition-transform ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            {Brand}
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {NavList}
          <div className="mt-auto pt-6">{LogoutBtn}</div>
        </aside>
      </div>
    </>
  );
}
