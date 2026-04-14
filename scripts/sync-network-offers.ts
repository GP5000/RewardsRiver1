/**
 * scripts/sync-network-offers.ts
 * Fetches offers from ad network APIs and upserts them into MongoDB.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/sync-network-offers.ts --network adtowall
 *   npx ts-node -r tsconfig-paths/register scripts/sync-network-offers.ts --network adtowall --dry-run
 *
 * Env vars required:
 *   MONGODB_URI
 *   ADTOWALL_APP_ID   (from AdToWall publisher dashboard)
 */

import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI env var is not set.");
  process.exit(1);
}

/* ─── Offer schema (inline to avoid model registry issues) ─── */

const OfferSchema = new mongoose.Schema(
  {
    name: String,
    title: String,
    description: String,
    network: { type: String, required: true },
    externalOfferId: String,
    redirectUrl: { type: String, required: true },
    payoutUsd: { type: Number, required: true },
    advertiserPayoutUsd: Number,
    estimatedMinutes: Number,
    category: String,
    badge: String,
    geoAllow: { type: [String], default: [] },
    geoDeny: { type: [String], default: [] },
    deviceTarget: { type: String, default: "all" },
    platforms: { type: [String], default: ["web"] },
    placementIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    dailyCap: Number,
    imageUrl: String,
    status: { type: String, default: "active" },
    statsClicks: { type: Number, default: 0 },
    statsConversions: { type: Number, default: 0 },
    statsEpcUsd: { type: Number, default: 0 },
    statsRevPubUsd: { type: Number, default: 0 },
    statsRevAdvUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const OfferModel =
  (mongoose.models.Offer as mongoose.Model<any>) ||
  mongoose.model("Offer", OfferSchema);

/* ─── Shared offer shape ─── */

interface OfferImport {
  externalOfferId: string;
  name: string;
  title: string;
  description: string;
  redirectUrl: string; // must contain {click_id}
  payoutUsd: number;
  advertiserPayoutUsd: number;
  category: string | null;
  imageUrl: string | null;
  estimatedMinutes: number | null;
  geoAllow: string[];
  geoDeny: string[];
  deviceTarget: "all" | "desktop" | "mobile";
  platforms: Array<"web" | "android" | "ios">;
  dailyCap: number | null;
}

/* ─────────────────────────────────────────────────────────────
   AdToWall adapter
   API docs: https://adtowall.com/publisher/api
   Feed returns offers available to your app_id.
   ───────────────────────────────────────────────────────────── */

async function fetchAdToWall(): Promise<OfferImport[]> {
  const appId = process.env.ADTOWALL_APP_ID;
  if (!appId) throw new Error("ADTOWALL_APP_ID env var not set");

  const url = `https://adtowall.com/api/v1/offers?app_id=${appId}`;
  console.log(`  Fetching ${url}`);

  const res = await fetch(url, {
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AdToWall API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();

  // AdToWall returns { offers: [...] } or just [...]
  const raw: any[] = Array.isArray(data) ? data : (data.offers ?? data.data ?? []);

  if (!raw.length) {
    console.log("  AdToWall returned 0 offers.");
    return [];
  }

  return raw.map((o: any): OfferImport => {
    // AdToWall tracking link — they use uid for the click/subid param
    // We store {click_id} which our click route substitutes with the UUID
    const trackingUrl = buildAdToWallUrl(appId, o);

    // Normalize device target
    let deviceTarget: "all" | "desktop" | "mobile" = "all";
    const device = (o.device ?? o.platform ?? "").toLowerCase();
    if (device === "mobile" || device === "android" || device === "ios") deviceTarget = "mobile";
    else if (device === "desktop" || device === "web") deviceTarget = "desktop";

    // Countries — AdToWall returns comma-separated string or array
    let geoAllow: string[] = [];
    if (o.countries) {
      geoAllow = typeof o.countries === "string"
        ? o.countries.split(",").map((c: string) => c.trim().toUpperCase()).filter(Boolean)
        : (o.countries as string[]).map((c: string) => c.toUpperCase());
    }

    // Category mapping
    const cat = o.category ?? o.type ?? null;

    return {
      externalOfferId: String(o.id ?? o.offer_id),
      name: o.name ?? o.title ?? "Untitled",
      title: o.name ?? o.title ?? "Untitled",
      description: o.description ?? "",
      redirectUrl: trackingUrl,
      payoutUsd: parseFloat(o.payout ?? o.revenue ?? 0),
      advertiserPayoutUsd: parseFloat(o.payout ?? o.revenue ?? 0),
      category: cat,
      imageUrl: o.image_url ?? o.icon ?? o.thumbnail ?? null,
      estimatedMinutes: o.time ?? o.estimated_minutes ?? null,
      geoAllow,
      geoDeny: [],
      deviceTarget,
      platforms: deviceTarget === "mobile" ? ["android", "ios"] : ["web"],
      dailyCap: o.daily_cap ?? o.cap ?? null,
    };
  });
}

/**
 * Build the AdToWall offer tracking URL.
 * AdToWall tracking links use &uid= for the subid / click_id.
 * We store {click_id} which the click route replaces with the UUID at click time.
 */
function buildAdToWallUrl(appId: string, offer: any): string {
  // If AdToWall gives us a pre-built click URL, normalise it
  if (offer.tracking_url ?? offer.click_url ?? offer.url) {
    const raw: string = offer.tracking_url ?? offer.click_url ?? offer.url;
    // Replace their uid/subid placeholders with our {click_id}
    return raw
      .replace(/\{uid\}/gi, "{click_id}")
      .replace(/\{user_id\}/gi, "{click_id}")
      .replace(/\{subid\}/gi, "{click_id}")
      .replace(/\{sub_id\}/gi, "{click_id}")
      .replace(/\[uid\]/gi, "{click_id}")
      .replace(/\[user_id\]/gi, "{click_id}");
  }

  // Fallback: build the standard AdToWall click URL manually
  const offerId = offer.id ?? offer.offer_id;
  return `https://adtowall.com/click?app_id=${appId}&offer_id=${offerId}&uid={click_id}`;
}

/* ─────────────────────────────────────────────────────────────
   Upsert logic (same pattern as import-offers.ts)
   ───────────────────────────────────────────────────────────── */

async function upsertOffers(
  network: string,
  offers: OfferImport[],
  dryRun: boolean
): Promise<{ inserted: number; updated: number; skipped: number; errors: number }> {
  let inserted = 0, updated = 0, skipped = 0, errors = 0;

  for (const o of offers) {
    if (!o.redirectUrl.includes("{click_id}")) {
      console.warn(`  WARN  no {click_id} in redirectUrl — postback matching will fail: ${o.name}`);
    }

    if (!o.payoutUsd || o.payoutUsd <= 0) {
      console.warn(`  SKIP  invalid payout for: ${o.name}`);
      skipped++;
      continue;
    }

    const doc = {
      name: o.name,
      title: o.title,
      description: o.description,
      network,
      externalOfferId: o.externalOfferId,
      redirectUrl: o.redirectUrl,
      payoutUsd: o.payoutUsd,
      advertiserPayoutUsd: o.advertiserPayoutUsd,
      estimatedMinutes: o.estimatedMinutes,
      category: o.category,
      imageUrl: o.imageUrl,
      geoAllow: o.geoAllow,
      geoDeny: o.geoDeny,
      deviceTarget: o.deviceTarget,
      platforms: o.platforms,
      dailyCap: o.dailyCap,
      status: "active",
    };

    if (dryRun) {
      console.log(
        `  DRY   ${network}/${o.externalOfferId} — ${o.name} ($${o.payoutUsd}) geo=[${o.geoAllow.join(",")||"ALL"}]`
      );
      continue;
    }

    try {
      const before = await OfferModel.findOne({ network, externalOfferId: o.externalOfferId });
      await OfferModel.findOneAndUpdate(
        { network, externalOfferId: o.externalOfferId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      if (before) {
        console.log(`  UPDATE  ${network}/${o.externalOfferId} — ${o.name}`);
        updated++;
      } else {
        console.log(`  INSERT  ${network}/${o.externalOfferId} — ${o.name}`);
        inserted++;
      }
    } catch (err: any) {
      console.error(`  ERROR   ${o.name}: ${err?.message}`);
      errors++;
    }
  }

  return { inserted, updated, skipped, errors };
}

/* ─── Network registry ─── */

const ADAPTERS: Record<string, () => Promise<OfferImport[]>> = {
  adtowall: fetchAdToWall,
};

/* ─── CLI ─── */

const args = process.argv.slice(2);
const networkArg = args[args.indexOf("--network") + 1] as string | undefined;
const dryRun = args.includes("--dry-run");

if (!networkArg) {
  console.error("Usage: sync-network-offers.ts --network adtowall [--dry-run]");
  console.error(`Available networks: ${Object.keys(ADAPTERS).join(", ")}`);
  process.exit(1);
}

if (!ADAPTERS[networkArg]) {
  console.error(`Unknown network: ${networkArg}`);
  console.error(`Available: ${Object.keys(ADAPTERS).join(", ")}`);
  process.exit(1);
}

/* ─── Main ─── */

async function run() {
  console.log(`\n[sync-network-offers] network=${networkArg} dry-run=${dryRun}\n`);

  const fetch = ADAPTERS[networkArg!];

  let offers: OfferImport[];
  try {
    offers = await fetch();
  } catch (err: any) {
    console.error(`Failed to fetch offers from ${networkArg}: ${err.message}`);
    process.exit(1);
  }

  console.log(`Fetched ${offers.length} offers from ${networkArg}.\n`);
  if (dryRun) console.log("DRY RUN — no writes will occur.\n");

  if (offers.length === 0) {
    console.log("Nothing to import.");
    process.exit(0);
  }

  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB.\n");

  const stats = await upsertOffers(networkArg!, offers, dryRun);

  console.log(
    `\nDone. inserted=${stats.inserted} updated=${stats.updated} skipped=${stats.skipped} errors=${stats.errors}`
  );

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
