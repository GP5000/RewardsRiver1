"use client";

import { useState } from "react";
import {
  BookOpen,
  Code2,
  Globe2,
  Link2,
  Copy,
  Zap,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

type Variant = "internal" | "public";

interface CodeBlockProps {
  label: string;
  code: string;
}

function CodeBlock({ label, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
        <span>{label}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-gray-300 hover:bg-white/10"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-all font-mono text-[12px] text-gray-100">
        {code}
      </pre>
    </div>
  );
}

interface Section {
  id: string;
  label: string;
}

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview" },
  { id: "flow", label: "Integration flow" },
  { id: "quickstart", label: "Quickstart" },
  { id: "hosted-wall", label: "Hosted offerwall" },
  { id: "iframe", label: "iFrame embed" },
  { id: "js-embed", label: "JS embed" },
  { id: "postbacks", label: "Postbacks" },
  { id: "security", label: "Security & validation" },
  { id: "testing", label: "Testing your setup" },
  { id: "errors", label: "Common errors" },
  { id: "faq", label: "FAQ" },
  { id: "api", label: "API (planned)" },
];

export default function PublisherIntegrationDocs({
  variant = "internal",
}: {
  variant?: Variant;
}) {
  const base =
    variant === "public" ? "https://rewardsriver.com" : "";

  const wallUrl = `${base}/wall?pid=YOUR_PUBLISHER_ID&subid={USER_ID}`;

  const iframeEmbed = `<iframe
  src="${base}/wall?pid=YOUR_PUBLISHER_ID&subid={USER_ID}"
  width="100%"
  height="700"
  frameborder="0"
  scrolling="auto"
  style="border-radius: 12px; overflow: hidden; background: #020617;"
></iframe>`;

  const jsEmbed = `const userId = getCurrentUserId(); // your logic
const pid = "YOUR_PUBLISHER_ID";

const wallUrl = "${base}/wall"
  + "?pid=" + encodeURIComponent(pid)
  + "&subid=" + encodeURIComponent(userId);

document.getElementById("rewardsriver-wall").src = wallUrl;`;

  const postbackExample = `${base || "https://your-domain.com"}/api/postbacks/rewardsriver?pid=123&user=USER123&tx=TX999&revenue=1.20&currency=USD&offer_id=42&event=conversion&signature=HMAC_SIGNATURE`;

  /* -------------------- language-specific handlers -------------------- */

  type Lang = "node" | "php" | "python";
  const [lang, setLang] = useState<Lang>("node");

  const nodeHandler = `// Example: Node.js / Express
app.get("/api/postbacks/rewardsriver", async (req, res) => {
  const {
    pid,
    user,
    tx,
    revenue,
    currency,
    offer_id,
    event,
    signature,
  } = req.query;

  // 1) Basic sanity checks
  if (!pid || !user || !tx || !revenue) {
    return res.status(400).send("missing params");
  }

  // 2) Idempotency – only process each tx once
  const existing = await db.Conversions.findOne({ tx });
  if (existing) {
    return res.status(200).send("already processed");
  }

  // 3) (Optional) HMAC validation – recommended
  const expected = createHmacSignature({
    pid,
    user,
    tx,
    revenue,
    currency,
  });
  if (signature && signature !== expected) {
    return res.status(403).send("bad signature");
  }

  // 4) Credit the user in your system
  await creditUser(user as string, Number(revenue));

  // 5) Store conversion for reporting
  await db.Conversions.create({
    tx,
    user,
    revenue: Number(revenue),
    currency: (currency as string) || "USD",
    offerId: (offer_id as string) || null,
    event: (event as string) || "conversion",
  });

  return res.status(200).send("ok");
});`;

  const phpHandler = `<?php
// Example: PHP (plain / Laravel-style controller)
function rewardsriverPostback() {
  $pid      = $_GET['pid']      ?? null;
  $user     = $_GET['user']     ?? null;
  $tx       = $_GET['tx']       ?? null;
  $revenue  = $_GET['revenue']  ?? null;
  $currency = $_GET['currency'] ?? 'USD';
  $offerId  = $_GET['offer_id'] ?? null;
  $event    = $_GET['event']    ?? 'conversion';
  $signature = $_GET['signature'] ?? null;

  if (!$pid || !$user || !$tx || !$revenue) {
    http_response_code(400);
    echo "missing params";
    return;
  }

  // Idempotency check
  if (conversion_exists($tx)) {
    http_response_code(200);
    echo "already processed";
    return;
  }

  // Optional: HMAC validation
  $expected = create_hmac_signature([
    'pid'      => $pid,
    'user'     => $user,
    'tx'       => $tx,
    'revenue'  => $revenue,
    'currency' => $currency,
  ]);
  if ($signature && $signature !== $expected) {
    http_response_code(403);
    echo "bad signature";
    return;
  }

  // Credit user & store conversion
  credit_user($user, floatval($revenue));
  store_conversion($tx, $user, floatval($revenue), $currency, $offerId, $event);

  http_response_code(200);
  echo "ok";
}
?>`;

  const pythonHandler = `# Example: Python / Flask
from flask import Flask, request, Response

app = Flask(__name__)

@app.get("/api/postbacks/rewardsriver")
def rewardsriver_postback():
    pid       = request.args.get("pid")
    user      = request.args.get("user")
    tx        = request.args.get("tx")
    revenue   = request.args.get("revenue")
    currency  = request.args.get("currency", "USD")
    offer_id  = request.args.get("offer_id")
    event     = request.args.get("event", "conversion")
    signature = request.args.get("signature")

    if not pid or not user or not tx or not revenue:
        return Response("missing params", status=400)

    # Idempotency check
    if conversion_exists(tx):
        return Response("already processed", status=200)

    # Optional: HMAC validation
    expected = create_hmac_signature({
        "pid": pid,
        "user": user,
        "tx": tx,
        "revenue": revenue,
        "currency": currency,
    })
    if signature and signature != expected:
        return Response("bad signature", status=403)

    # Credit user & store conversion
    credit_user(user, float(revenue))
    store_conversion(tx, user, float(revenue), currency, offer_id, event)

    return Response("ok", status=200)`;

  const getLangLabel = (l: Lang) =>
    l === "node" ? "Node.js" : l === "php" ? "PHP" : "Python";

  const scrollTo = (id: string) => {
    if (typeof document === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const isPublic = variant === "public";

  return (
    <div className="flex gap-8 text-white">
      {/* TOC */}
      <aside className="sticky top-24 hidden w-56 shrink-0 lg:block">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs">
          <div className="mb-2 flex items-center gap-2 text-gray-300">
            <BookOpen className="h-4 w-4 text-sky-400" />
            <span className="font-semibold">Docs navigation</span>
          </div>
          <ul className="space-y-1 pt-1">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  className="w-full text-left text-[11px] text-gray-400 hover:text-sky-300"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main */}
      <div className="w-full max-w-4xl">
        {/* Header */}
        <header id="overview" className="mb-8">
          <div className="flex items-center gap-3">
            <BookOpen className="h-7 w-7 text-sky-400" />
            <div>
              <h1 className="text-3xl font-semibold">
                {isPublic
                  ? "RewardsRiver Publisher Integration"
                  : "Publisher Integration Docs"}
              </h1>
              <p className="mt-2 text-sm text-gray-300">
                Connect your app, game, or rewards site to RewardsRiver with a
                hosted offerwall, iFrame embed, and secure server-to-server
                postbacks.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-xs text-gray-300 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                For publishers
              </p>
              <p className="mt-1">
                Create placements, embed the wall, and track earnings in
                real-time.
              </p>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
                For engineers
              </p>
              <p className="mt-1">
                Simple integration via URL params, iFrames, and webhooks.
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-300">
                Time to live
              </p>
              <p className="mt-1">
                Most teams go live in under a day once postbacks are wired.
              </p>
            </div>
          </div>
        </header>

        {/* Flow diagram */}
        <section
          id="flow"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="text-lg font-semibold">Integration flow</h2>
          <p className="mt-2 text-sm text-gray-300">
            At a high level, this is how traffic and rewards move through
            RewardsRiver:
          </p>
          <div className="mt-3 rounded-xl border border-white/10 bg-black/60 p-4 text-xs">
            <pre className="whitespace-pre font-mono text-[11px] text-gray-100">
{`User starts offer     Click / impression       Offer network & advertisers
      │                         │                          │
      ▼                         ▼                          │
Your app / site ──▶ RewardsRiver wall ────────────────────▶│
      ▲                         │                          │
      │                         ▼                          ▼
      │                 Conversion tracked          Payout confirmed
      │                         │                          │
      │                         ▼                          │
      └─────────────◀ Postback to your backend ◀───────────┘
                               │
                               ▼
                       User balance updated`}
            </pre>
          </div>
        </section>

        {/* Quickstart */}
        <section
          id="quickstart"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="text-lg font-semibold">Quickstart checklist</h2>
          <p className="mt-2 text-sm text-gray-300">
            Follow these steps to get a production-ready integration with
            RewardsRiver:
          </p>
          <ol className="mt-3 space-y-2 text-sm text-gray-200">
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300">
                1
              </span>
              Create your first{" "}
              <span className="font-semibold">placement</span> in the publisher
              dashboard.
            </li>
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300">
                2
              </span>
              Embed the wall via{" "}
              <span className="font-semibold">hosted link</span> or{" "}
              <span className="font-semibold">iFrame</span>, passing a stable
              user/subID.
            </li>
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300">
                3
              </span>
              Configure your{" "}
              <span className="font-semibold">postback URL</span> in Settings →
              Publisher Settings.
            </li>
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300">
                4
              </span>
              Use the <span className="font-semibold">Postback Tester</span> in
              the dashboard to send test conversions.
            </li>
            <li>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-[11px] font-semibold text-sky-300">
                5
              </span>
              Go live and monitor clicks, conversions, EPC, and revenue in the
              publisher dashboard.
            </li>
          </ol>
        </section>

        {/* Hosted Offerwall */}
        <section
          id="hosted-wall"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Globe2 className="h-5 w-5 text-sky-400" />
            Hosted offerwall URL
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            The simplest integration is to send users to your hosted
            RewardsRiver offerwall. We handle tracking, device detection, and
            localisation for you.
          </p>

          <CodeBlock label="Basic wall URL" code={wallUrl} />

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-200">
              Required query parameters
            </h3>
            <div className="mt-2 overflow-x-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="border border-white/10 px-3 py-1 text-left">
                      Param
                    </th>
                    <th className="border border-white/10 px-3 py-1 text-left">
                      Description
                    </th>
                    <th className="border border-white/10 px-3 py-1 text-left">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      pid
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Your RewardsRiver publisher ID (shown in your dashboard).
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      pid=123
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      subid / user / uid
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Stable user identifier from your system – used for
                      crediting rewards.
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      subid=USER_987
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-gray-400">
              Use the same identifier for both the offerwall (subID) and your
              postback handler so that conversions always credit the right
              account.
            </p>
          </div>
        </section>

        {/* iFrame Embed */}
        <section
          id="iframe"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Link2 className="h-5 w-5 text-violet-400" />
            iFrame embed
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Use an iFrame to keep users inside your own layout while RewardsRiver
            handles the offerwall content.
          </p>

          <CodeBlock label="Basic iFrame embed" code={iframeEmbed} />

          <p className="mt-3 text-xs text-gray-400">
            We recommend a dedicated &quot;Earn&quot; or &quot;Offerwall&quot;
            page with a minimum height of 650–800px. You can wrap the iFrame in
            your own navigation and branding.
          </p>
        </section>

        {/* JS Embed */}
        <section
          id="js-embed"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Code2 className="h-5 w-5 text-sky-300" />
            JavaScript embed
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            For more dynamic setups, you can set the wall URL via JavaScript,
            using the current logged-in user and your publisher ID.
          </p>

          <CodeBlock label="JS embed example" code={jsEmbed} />

          <p className="mt-3 text-xs text-gray-400">
            This pattern is useful if you render your app client-side or need to
            inject the wall URL after authentication.
          </p>
        </section>

        {/* Postbacks */}
        <section
          id="postbacks"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-emerald-400" />
            Conversion postbacks (server-to-server)
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            When a user completes an offer, RewardsRiver sends a
            server-to-server callback (postback) to your endpoint so you can
            credit the user in your system.
          </p>

          <CodeBlock
            label="Example postback URL (you host this endpoint)"
            code={postbackExample}
          />

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-gray-200">
              Common postback parameters
            </h3>
            <div className="mt-2 overflow-x-auto text-xs">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-white/5">
                    <th className="border border-white/10 px-3 py-1 text-left">
                      Param
                    </th>
                    <th className="border border-white/10 px-3 py-1 text-left">
                      Description
                    </th>
                    <th className="border border-white/10 px-3 py-1 text-left">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      pid
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Your publisher ID.
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      123
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      user
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      The same user/subID you passed to the offerwall.
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      USER_987
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      tx
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Unique transaction / conversion ID.
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      TX999
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      revenue
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Gross revenue for the action (before your share).
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      1.20
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      currency
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Currency code (usually USD).
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      USD
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      offer_id
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Internal offer or campaign ID for reporting.
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      42
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      event
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Type of event – e.g.{" "}
                      <code className="font-mono">conversion</code> or{" "}
                      <code className="font-mono">reversal</code>.
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      conversion
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      signature
                    </td>
                    <td className="border border-white/10 px-3 py-1">
                      Optional HMAC used to verify authenticity (see below).
                    </td>
                    <td className="border border-white/10 px-3 py-1 font-mono">
                      4fd2ab...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-xs text-emerald-100">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              Recommended: idempotent processing
            </p>
            <p className="mt-1 text-emerald-100">
              Store each transaction ID once. If you receive the same{" "}
              <code>tx</code> again, return HTTP 200 without re-crediting the
              user. This protects you from duplicate postbacks and retries.
            </p>
          </div>

          {/* Language tabs */}
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-gray-200">
              Sample postback handlers
            </h3>
            <div className="mb-3 inline-flex rounded-full border border-white/15 bg-black/50 p-1 text-xs">
              {(["node", "php", "python"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={`rounded-full px-3 py-1 ${
                    lang === l
                      ? "bg-sky-500 text-white"
                      : "text-gray-300 hover:text-white"
                  }`}
                >
                  {getLangLabel(l)}
                </button>
              ))}
            </div>

            {lang === "node" && (
              <CodeBlock
                label="Node.js / Express handler"
                code={nodeHandler}
              />
            )}
            {lang === "php" && (
              <CodeBlock label="PHP handler" code={phpHandler} />
            )}
            {lang === "python" && (
              <CodeBlock label="Python / Flask handler" code={pythonHandler} />
            )}
          </div>
        </section>

        {/* Security & validation */}
        <section
          id="security"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
            Security &amp; validation
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            RewardsRiver is built to be secure by default. Follow these best
            practices to harden your integration:
          </p>

          <ul className="mt-3 space-y-2 text-sm text-gray-200">
            <li>
              <span className="font-semibold">1. Validate IPs (optional).</span>{" "}
              Restrict postback handling to RewardsRiver IP ranges where
              possible.
            </li>
            <li>
              <span className="font-semibold">2. Use signatures.</span> If you
              enable HMAC signing, validate the{" "}
              <code className="font-mono">signature</code> param using your
              shared secret.
            </li>
            <li>
              <span className="font-semibold">3. Verify users.</span> Confirm
              the <code className="font-mono">user</code> / subID belongs to a
              valid account before crediting.
            </li>
            <li>
              <span className="font-semibold">4. Idempotency.</span> Only
              process each <code className="font-mono">tx</code> once.
            </li>
            <li>
              <span className="font-semibold">5. Logging.</span> Log failed
              postbacks with reason so you can debug campaigns quickly.
            </li>
          </ul>

          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
            <p className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Important
            </p>
            <p className="mt-1">
              Never trust query parameters blindly. Treat them as untrusted
              input and validate / sanitize them before using them in your
              business logic.
            </p>
          </div>
        </section>

        {/* Testing */}
        <section
          id="testing"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-sky-300" />
            Testing your setup
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Use the built-in tools in the publisher dashboard to verify your
            integration before sending live traffic.
          </p>

          <ol className="mt-3 space-y-2 text-sm text-gray-200">
            <li>
              <span className="font-semibold">1. Configure your postback.</span>{" "}
              Go to <span className="font-mono">Settings → Publisher Settings</span>{" "}
              and set your postback URL.
            </li>
            <li>
              <span className="font-semibold">2. Open Postback Tester.</span> In
              the sidebar, click{" "}
              <span className="font-mono">Postback Tester</span>.
            </li>
            <li>
              <span className="font-semibold">3. Send a test.</span> Choose a
              sample payout and subID, send a test, and confirm your endpoint
              returns <code>HTTP 200</code>.
            </li>
            <li>
              <span className="font-semibold">4. Verify credit.</span> Check
              that your own app credits the test user with the expected reward.
            </li>
          </ol>
        </section>

        {/* Errors */}
        <section
          id="errors"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="text-lg font-semibold">Common errors</h2>
          <p className="mt-2 text-sm text-gray-300">
            Here are some typical integration issues and how to fix them:
          </p>

          <div className="mt-3 overflow-x-auto text-xs">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="border border-white/10 px-3 py-1 text-left">
                    Error / behaviour
                  </th>
                  <th className="border border-white/10 px-3 py-1 text-left">
                    Cause
                  </th>
                  <th className="border border-white/10 px-3 py-1 text-left">
                    Fix
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-white/10 px-3 py-1">
                    Wall shows &quot;Missing pid&quot;
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    You didn&apos;t pass your publisher ID.
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    Add <code>?pid=YOUR_PUBLISHER_ID</code> to the wall URL.
                  </td>
                </tr>
                <tr>
                  <td className="border border-white/10 px-3 py-1">
                    Users don&apos;t get rewards
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    Postback not configured or returning non-200.
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    Set your postback URL in Settings and ensure it returns{" "}
                    <code>200 OK</code>.
                  </td>
                </tr>
                <tr>
                  <td className="border border-white/10 px-3 py-1">
                    Duplicate rewards
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    Postbacks re-processed without checking <code>tx</code>.
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    Store each transaction ID; ignore repeats.
                  </td>
                </tr>
                <tr>
                  <td className="border border-white/10 px-3 py-1">
                    &quot;Invalid signature&quot; (if using HMAC)
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    Signature generated with wrong secret or wrong param order.
                  </td>
                  <td className="border border-white/10 px-3 py-1">
                    Ensure you match the RewardsRiver signature algorithm and
                    use the same secret as in your dashboard.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="mb-10 rounded-2xl border border-white/10 bg-[#050814]/80 p-6"
        >
          <h2 className="text-lg font-semibold">FAQ</h2>
          <div className="mt-3 space-y-3 text-sm text-gray-200">
            <div>
              <p className="font-semibold">
                Can I use multiple apps / sites under one publisher account?
              </p>
              <p className="mt-1 text-gray-300">
                Yes. You can create multiple placements for different apps,
                sites, and GEO splits under a single publisher account.
              </p>
            </div>
            <div>
              <p className="font-semibold">
                How often are stats updated in the dashboard?
              </p>
              <p className="mt-1 text-gray-300">
                Clicks and conversions are streamed in real-time or near
                real-time, depending on the upstream network. Balances and
                wallet figures update as new conversions are processed.
              </p>
            </div>
            <div>
              <p className="font-semibold">
                What should I use as the user / subID?
              </p>
              <p className="mt-1 text-gray-300">
                Use a stable, unique identifier for each user (internal user ID,
                UUID, or wallet address). Do not use sensitive data like emails
                in plain text.
              </p>
            </div>
            <div>
              <p className="font-semibold">
                Can I disable certain GEOs or offer types?
              </p>
              <p className="mt-1 text-gray-300">
                Yes. Reach out to support or your RewardsRiver rep to adjust
                GEOs, categories, or traffic restrictions on your account.
              </p>
            </div>
          </div>
        </section>

        {/* API planned */}
        <section
          id="api"
          className="mb-16 rounded-2xl border border-dashed border-white/15 bg-[#050814]/60 p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Code2 className="h-5 w-5 text-orange-400" />
            Advanced API access
            <span className="rounded-full bg-orange-500/20 px-2 py-[2px] text-xs font-semibold text-orange-300">
              Planned
            </span>
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            JSON APIs for pulling offers and stats are planned for advanced
            partners.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-300">
            <li>
              <span className="font-mono">GET /api/publisher/offers</span> –
              list offers by GEO, device, and category.
            </li>
            <li>
              <span className="font-mono">GET /api/publisher/stats</span> –
              earnings and conversion stats by date range.
            </li>
            <li>
              <span className="font-mono">GET /api/publisher/conversions</span>{" "}
              – detailed conversion logs for reconciliation.
            </li>
          </ul>
          <p className="mt-3 text-xs text-gray-400">
            If you&apos;re interested in early API access, contact support or
            your RewardsRiver rep from within the dashboard.
          </p>
        </section>
      </div>
    </div>
  );
}
