"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavLink = {
  href: string;
  label: string;
};

const mainLinks: NavLink[] = [
  { href: "/#publishers", label: "For Publishers" },
  { href: "/#advertisers", label: "For Advertisers" },
  { href: "/#platform", label: "Platform" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/docs/publisher", label: "Docs" },
];

export function ExternalNavbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return false; // hash links – don’t treat as active route
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo + brand */}
        <Link href="/" className="flex items-center gap-3">
  <div className="relative h-10 w-42 sm:h-15 sm:w-55">
    <Image
      src="/logo8.jpg"
      alt="RewardsRiver"
      fill
      className="object-contain"
      priority
    />
  </div>
</Link>


        {/* Desktop links */}
        <div className="hidden items-center gap-6 text-sm text-gray-300 md:flex">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                isActive(link.href) ? "text-sky-400" : "hover:text-sky-300"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/publisher/login"
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-sky-500/60 hover:text-sky-300"
          >
            Publisher login
          </Link>
          <Link
            href="/publisher/register"
            className="rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-black shadow-sm hover:bg-sky-400"
          >
            Become a publisher
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="inline-flex items-center justify-center rounded-md border border-white/10 p-2 text-gray-200 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          <span className="sr-only">Toggle navigation</span>
          <div className="space-y-[3px]">
            <span className="block h-[2px] w-4 bg-current" />
            <span className="block h-[2px] w-4 bg-current" />
            <span className="block h-[2px] w-4 bg-current" />
          </div>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/10 bg-black/95 md:hidden">
          <div className="mx-auto max-w-6xl px-4 py-3 text-sm text-gray-200">
            <div className="flex flex-col gap-2">
              {mainLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-md px-2 py-1 ${
                    isActive(link.href)
                      ? "bg-sky-500/15 text-sky-300"
                      : "hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/publisher/login"
                onClick={() => setOpen(false)}
                className="rounded-md border border-white/15 px-3 py-1.5 text-center text-xs font-medium text-gray-200 hover:border-sky-500/60 hover:text-sky-300"
              >
                Publisher login
              </Link>
              <Link
                href="/publisher/register"
                onClick={() => setOpen(false)}
                className="rounded-md bg-sky-500 px-3 py-1.5 text-center text-xs font-semibold text-black hover:bg-sky-400"
              >
                Become a publisher
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
