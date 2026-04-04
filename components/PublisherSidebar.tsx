"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Wallet,
  Link2,
  BookOpen,
  Settings,
  Menu,
  X,
  PlusSquare,
  LayoutGrid,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { Suspense, useState } from "react";
import { signOut } from "next-auth/react";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  activeMatch: string; // path part used for active state
};

function PublisherSidebarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Read current publisherId from URL if present
  const publisherId = searchParams.get("publisherId") || "";

  // Hrefs that carry publisherId for placements routes
  const placementsHref = publisherId
    ? `/publisher/placements?publisherId=${publisherId}`
    : "/publisher/placements";

  const addPlacementHref = publisherId
    ? `/publisher/placements/add?publisherId=${publisherId}`
    : "/publisher/placements/add";

  const navItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/publisher",
      icon: LayoutDashboard,
      activeMatch: "/publisher",
    },
    {
      name: "Offers Explorer",
      href: "/publisher/offers",
      icon: Layers,
      activeMatch: "/publisher/offers",
    },
    {
      name: "Payouts",
      href: "/publisher/payouts",
      icon: Wallet,
      activeMatch: "/publisher/payouts",
    },
    {
      name: "Earnings",
      href: "/publisher/earnings",
      icon: TrendingUp,
      activeMatch: "/publisher/earnings",
    },
    {
      name: "Postback Tester",
      href: "/publisher/postback-tester",
      icon: Link2,
      activeMatch: "/publisher/postback-tester",
    },
    {
      name: "Integration Docs",
      href: "/publisher/docs",
      icon: BookOpen,
      activeMatch: "/publisher/docs",
    },
    {
      name: "Placements",
      href: placementsHref,
      icon: LayoutGrid,
      activeMatch: "/publisher/placements",
    },
    {
      name: "Add Placement",
      href: addPlacementHref,
      icon: PlusSquare,
      activeMatch: "/publisher/placements/add",
    },
    {
      name: "Settings",
      href: "/publisher/settings",
      icon: Settings,
      activeMatch: "/publisher/settings",
    },
  ];

  const handleLogout = async () => {
    // Will clear session and redirect to login
    await signOut({ callbackUrl: "/publisher/login" });
  };

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="sm:hidden fixed top-4 left-4 z-50 bg-black/70 p-2 rounded-md border border-white/10"
        onClick={() => setOpen(!open)}
      >
        {open ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="sm:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-[#050814] border-r border-white/10
          shadow-xl z-50 transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
          <img src="/Logo8.jpg" className="w-10 h-10 rounded-md object-cover" alt="Logo" />
          <div className="flex flex-col">
            <span className="text-base font-semibold text-white tracking-wide">
              RewardsRiver
            </span>
            <span className="text-[11px] text-slate-400">
              Publisher dashboard
            </span>
          </div>
        </div>

        {/* Nav + Logout */}
        <div className="flex h-[calc(100%-80px)] flex-col">
          {/* Nav */}
          <nav className="flex flex-col mt-4 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              // activeMatch ignores query params so /publisher/placements
              // and /publisher/placements?publisherId=... both highlight
              const active = pathname === item.activeMatch;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition
                    ${
                      active
                        ? "bg-blue-600/20 border border-blue-600/40 text-blue-300"
                        : "text-gray-300 hover:bg-white/5"
                    }
                  `}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout button at bottom */}
          <div className="mt-auto px-4 pb-6 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 hover:bg-red-500/20 hover:border-red-400 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default function PublisherSidebar() {
  return (
    <Suspense fallback={null}>
      <PublisherSidebarInner />
    </Suspense>
  );
}
