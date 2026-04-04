"use client";

import Link from "next/link";
import Image from "next/image";

export default function DocsTopBar() {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/5 pb-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 overflow-hidden rounded-xl bg-slate-900/80">
          <Image
            src="/rewardsriver-mark.png" // or logo-full if you don't have the mark yet
            alt="RewardsRiver"
            fill
            className="object-contain"
          />
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-400">
            Publisher docs
          </p>
          <h1 className="text-xl font-semibold text-white sm:text-2xl">
            Integrate your app with RewardsRiver
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            The same integration guide you see inside the dashboard, available
            publicly for your team.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/publisher/register"
          className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-sky-500/60 hover:text-sky-300"
        >
          Apply as a publisher
        </Link>
        <Link
          href="/publisher/login"
          className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-black shadow-sm hover:bg-sky-400"
        >
          Publisher login
        </Link>
      </div>
    </div>
  );
}
