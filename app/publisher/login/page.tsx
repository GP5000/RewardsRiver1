"use client";
export const dynamic = "force-dynamic";
import { Suspense, useState, FormEvent } from "react";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function PublisherLoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setErrorMsg(res.error);
      return;
    }

    // Fetch the session to read the role and redirect to the correct dashboard
    const { getSession } = await import("next-auth/react");
    const session = await getSession();
    const role = (session?.user as any)?.role;

    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl) {
      router.push(callbackUrl);
    } else if (role === "admin") {
      router.push("/admin/offers");
    } else if (role === "advertiser") {
      router.push("/advertiser/dashboard");
    } else {
      router.push("/publisher/placements");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-black to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back link / header */}
        <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-emerald-300"
          >
            <span className="text-lg">←</span>
            <span>Back to RewardsRiver</span>
          </Link>
          <span>Publisher login</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-black/70 p-[1px] shadow-[0_0_60px_rgba(15,23,42,0.9)]">
          <div className="rounded-2xl bg-gradient-to-b from-slate-950 via-black to-slate-950 px-7 py-7">
            {/* Logo / Brand */}
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-sky-500 text-lg font-bold text-slate-950 shadow-lg shadow-emerald-500/40">
                RR
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">
                  RewardsRiver Publisher
                </h1>
                <p className="text-xs text-gray-400">
                  Sign in to manage your placements, offers, and earnings.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-gray-300"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-gray-300"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              {errorMsg && (
                <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-[11px] text-gray-500 text-center">
              Don&apos;t have a publisher account yet?{" "}
              <Link
                href="/publisher/register"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Apply as a publisher
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PublisherLoginPage() {
  return (
    <Suspense>
      <PublisherLoginPageInner />
    </Suspense>
  );
}
