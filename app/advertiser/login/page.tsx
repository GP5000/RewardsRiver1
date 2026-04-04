"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdvertiserLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/advertiser/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    router.push(res?.url || callbackUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0c1220] to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-sky-300">
            <span className="text-lg">←</span>
            <span>Back to RewardsRiver</span>
          </Link>
          <span>Advertiser login</span>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-black/70 p-[1px] shadow-[0_0_60px_rgba(15,23,42,0.9)]">
          <div className="rounded-2xl bg-gradient-to-b from-slate-950 via-black to-slate-950 px-7 py-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-lg font-bold text-slate-950 shadow-lg shadow-sky-500/40">
                RR
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">RewardsRiver Advertiser</h1>
                <p className="text-xs text-gray-400">Sign in to manage your campaigns and spend.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-gray-300">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-medium text-gray-300">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-300 border border-red-500/40">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-4 text-[11px] text-gray-500 text-center">
              Don&apos;t have an advertiser account?{" "}
              <Link href="/advertiser/register" className="text-sky-400 hover:text-sky-300">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
