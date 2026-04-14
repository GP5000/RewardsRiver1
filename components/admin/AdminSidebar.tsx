// components/admin/AdminSidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { X } from "lucide-react";
import { useState } from "react";

const ADMIN_LINKS = [
  { href: "/admin/offers", label: "Offers" },
  { href: "/admin/offers/import", label: "Import Offers" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/conversions", label: "Conversions" },
  { href: "/admin/placements", label: "Placements" },
  { href: "/admin/publishers", label: "Publishers" },
  { href: "/admin/advertisers", label: "Advertisers" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/fraud", label: "Fraud Monitor" },
  { href: "/admin/settings", label: "Settings" },
];

type AdminSidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
};

export function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await signOut({ callbackUrl: "/" });
    } finally {
      setLoggingOut(false);
    }
  }

  const initials =
    (session?.user?.name || session?.user?.email || "A")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const NavList = (
    <nav className="mt-4 space-y-1 text-sm">
      {ADMIN_LINKS.map((item) => {
        const exactMatch = ["/admin/offers", "/admin/offers/import", "/admin/placements", "/admin/conversions", "/admin/analytics", "/admin/fraud", "/admin/settings"];
        const active =
          pathname === item.href ||
          (!exactMatch.includes(item.href) && pathname?.startsWith(item.href + "/"));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
              active
                ? "bg-cyan-500/15 text-cyan-300"
                : "text-slate-300 hover:bg-slate-900 hover:text-slate-100"
            }`}
          >
            <span>{item.label}</span>
            {active && (
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  const LogoutButton = (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-rose-500/80 hover:bg-rose-900/60 hover:text-rose-50 disabled:opacity-60"
    >
      {loggingOut ? "Logging out…" : "Log out"}
    </button>
  );

  /* Desktop sidebar */
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-950/90 px-4 py-6 lg:flex">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
              RewardsRiver
            </p>
            <h2 className="mt-1 text-sm font-semibold text-slate-50">
              Admin Console
            </h2>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-semibold text-cyan-200">
            {initials}
          </div>
        </div>

        {NavList}

        <div className="mt-auto pt-6">
          <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            Session
          </p>
          {LogoutButton}
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileOpen}
      >
        {/* Overlay */}
        <div
          onClick={onClose}
          className={`absolute inset-0 bg-black/60 transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Drawer panel */}
        <aside
          className={`absolute inset-y-0 left-0 w-72 max-w-full border-r border-slate-800 bg-slate-950/95 px-4 py-6 shadow-2xl transition-transform ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
                RewardsRiver
              </p>
              <h2 className="mt-1 text-sm font-semibold text-slate-50">
                Admin Console
              </h2>
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-slate-50"
              aria-label="Close admin navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {NavList}

          <div className="mt-auto pt-6">
            {LogoutButton}
            <p className="mt-2 truncate text-[11px] text-slate-500">
              {session?.user?.email}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
