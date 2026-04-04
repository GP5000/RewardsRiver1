// app/advertiser/layout.tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { AdvertiserSidebar } from "@/components/advertiser/AdvertiserSidebar";
import { Menu } from "lucide-react";

const AUTH_PAGES = ["/advertiser/login", "/advertiser/register"];

function AdvertiserShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuth = AUTH_PAGES.includes(pathname ?? "");

  if (isAuth) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100">
      <AdvertiserSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 lg:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400/80">RewardsRiver</p>
            <h1 className="text-sm font-semibold text-slate-50">Advertiser</h1>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 hover:border-sky-400 hover:text-sky-200"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 px-4 pb-8 pt-4 lg:px-8 lg:pt-8">{children}</main>
      </div>
    </div>
  );
}

export default function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AdvertiserShell>{children}</AdvertiserShell>
    </SessionProvider>
  );
}
