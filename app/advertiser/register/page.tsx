"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdvertiserRegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    companyName: "",
    websiteUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/advertiser/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    const data = await res.json();

    if (!data.ok) {
      setError(data.error || "Registration failed.");
      return;
    }

    setApiKey(data.apiKey);
  };

  if (apiKey) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#020617] to-black flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-slate-950 px-7 py-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-2xl">
            ✓
          </div>
          <h1 className="text-lg font-semibold text-white">Account created!</h1>
          <p className="mt-2 text-sm text-gray-400">
            Save your API key — it will only be shown once.
          </p>
          <div className="mt-4 rounded-lg border border-sky-500/30 bg-slate-900 px-4 py-3 font-mono text-sm text-sky-300 break-all">
            {apiKey}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Your account is pending review. An admin will activate it shortly.
          </p>
          <Link
            href="/advertiser/login"
            className="mt-5 inline-block rounded-md bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:brightness-110"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0c1220] to-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center justify-between text-[11px] text-slate-400">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-sky-300">
            <span className="text-lg">←</span>
            <span>Back to RewardsRiver</span>
          </Link>
          <span>Advertiser registration</span>
        </div>

        <div className="rounded-2xl border border-sky-500/30 bg-black/70 p-[1px] shadow-[0_0_60px_rgba(15,23,42,0.9)]">
          <div className="rounded-2xl bg-gradient-to-b from-slate-950 via-black to-slate-950 px-7 py-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 text-lg font-bold text-slate-950 shadow-lg shadow-sky-500/40">
                RR
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">Create advertiser account</h1>
                <p className="text-xs text-gray-400">Launch campaigns and reach engaged users.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300">Your name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300">Company name</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={set("companyName")}
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                    placeholder="Acme Corp"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300">Email</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set("email")}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300">Password</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                  placeholder="••••••••"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300">
                  Website URL <span className="text-gray-500">(optional)</span>
                </label>
                <input
                  type="url"
                  value={form.websiteUrl}
                  onChange={set("websiteUrl")}
                  className="mt-1 w-full rounded-md border border-white/10 bg-black/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
                  placeholder="https://yourcompany.com"
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
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="mt-4 text-[11px] text-gray-500 text-center">
              Already have an account?{" "}
              <Link href="/advertiser/login" className="text-sky-400 hover:text-sky-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
