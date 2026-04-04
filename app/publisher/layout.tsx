// app/publisher/layout.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import PublisherSidebar from "@/components/PublisherSidebar";

export default function PublisherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Pages that should NOT show the sidebar (auth screens)
  const isAuthPage =
    pathname === "/publisher/login" || pathname === "/publisher/register";

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white">
      {/* Fixed sidebar on the left */}
      <PublisherSidebar />

      {/* Main content: leave room for the 256px sidebar on sm+ */}
      <div className="min-h-screen pt-6 px-4 sm:px-8 sm:ml-64">
        {children}
      </div>
    </div>
  );
}
