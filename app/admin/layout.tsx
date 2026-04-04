// app/admin/layout.tsx
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Menu } from "lucide-react";

type AdminLayoutProps = {
  children: ReactNode;
};

function AdminShell({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin =
    !!session &&
    ((session.user as any)?.role === "admin" ||
      (session.user as any)?.isAdmin === true ||
      (session.user as any)?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <p className="text-sm text-slate-300">Checking admin access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-slate-100">
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 px-6 py-4 text-center">
          <h1 className="text-lg font-semibold text-red-100">
            Admin access required
          </h1>
          <p className="mt-1 text-sm text-red-200/80">
            You must be an admin to view this area.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#020617] text-slate-100">
      {/* Sidebar (desktop + mobile drawer) */}
      <AdminSidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col lg:ml-64">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 py-3 lg:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/80">
              RewardsRiver
            </p>
            <h1 className="text-sm font-semibold text-slate-50">
              Admin Console
            </h1>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 hover:border-cyan-400 hover:text-cyan-200"
            aria-label="Open admin navigation"
          >
            <Menu className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 px-4 pb-8 pt-4 lg:px-8 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SessionProvider>
      <AdminShell>{children}</AdminShell>
    </SessionProvider>
  );
}
