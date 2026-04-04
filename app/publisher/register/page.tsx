"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function PublisherRegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [publisherName, setPublisherName] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirm) {
      setErrorMsg("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/publisher/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          publisherName,
          website: website || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        setErrorMsg(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/publisher/placements",
      });

      setLoading(false);

      if (loginRes?.error) {
        setErrorMsg(loginRes.error);
        return;
      }

      router.push(loginRes?.url || "/publisher/placements");
    } catch (err: any) {
      console.error("REGISTER ERROR:", err);
      setErrorMsg(err?.message ?? "Unexpected error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-black to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back link / brand inline with landing style */}
        <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-emerald-300"
          >
            <span className="text-lg">←</span>
            <span>Back to RewardsRiver</span>
          </Link>
          <span>Publisher sign up</span>
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
                  Create a publisher account to access your offerwall dashboard.
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="publisherName"
                  className="block text-xs font-medium text-gray-300"
                >
                  Publisher / company name
                </label>
                <input
                  id="publisherName"
                  type="text"
                  value={publisherName}
                  onChange={(e) => setPublisherName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="MoonMiles Media"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-gray-300"
                >
                  Work email
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
                  htmlFor="website"
                  className="block text-xs font-medium text-gray-300"
                >
                  Website (optional)
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  placeholder="https://your-site.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm"
                    className="block text-xs font-medium text-gray-300"
                  >
                    Confirm
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    required
                  />
                </div>
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
                {loading ? "Creating account..." : "Create publisher account"}
              </button>
            </form>

            <p className="mt-4 text-[11px] text-gray-500 text-center">
              Already have an account?{" "}
              <Link
                href="/publisher/login"
                className="text-emerald-400 hover:text-emerald-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
