/**
 * scripts/import-offers.ts
 * Bulk-upserts offers from a JSON file into MongoDB.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/import-offers.ts --file offers/cpagrip.json
 *   npx ts-node -r tsconfig-paths/register scripts/import-offers.ts --file offers/cpagrip.json --dry-run
 *
 * The JSON file is an array of OfferImport objects (see type below).
 * Upsert key: network + externalOfferId  →  safe to re-run without creating duplicates.
 * If an offer has no externalOfferId, it is always inserted as new.
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";

// Resolve tsconfig paths so @/ aliases work
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI env var is not set.");
  process.exit(1);
}

/* ─── Import shape ─── */
interface OfferImport {
  /** Human-readable name shown in the admin */
  name: string;
  /** Display title shown to users in the wall */
  title?: string;
  /** Short description (1-2 sentences) */
  description?: string;
  /** Network slug — use a consistent name, e.g. "cpagrip", "offertoro", "adgem" */
  network: string;
  /** The network's own offer ID — used as upsert key */
  externalOfferId?: string;
  /**
   * The network's offer URL with {click_id} macro in it.
   * Example: "https://www.cpagrip.com/show.php?l=0&u=YOUR_ID&id=OFFER_ID&s1={click_id}"
   * The click endpoint will replace {click_id} with the generated UUID before redirecting.
   */
  redirectUrl: string;
  /** What the publisher/user earns per conversion (USD) */
  payoutUsd: number;
  /** What the advertiser pays (leave blank to default to payoutUsd) */
  advertiserPayoutUsd?: number;
  /** Estimated minutes to complete */
  estimatedMinutes?: number;
  /** Category shown in the wall filter tabs */
  category?: string;
  /** Badge label e.g. "HOT", "NEW", "FEATURED" */
  badge?: string;
  /** ISO-3166-1 alpha-2 country codes to allow. Empty = all. */
  geoAllow?: string[];
  /** ISO-3166-1 alpha-2 country codes to deny */
  geoDeny?: string[];
  /** "all" | "desktop" | "mobile" */
  deviceTarget?: "all" | "desktop" | "mobile";
  /** ["web"] | ["android"] | ["ios"] | any combo */
  platforms?: Array<"web" | "android" | "ios">;
  /** Daily conversion cap */
  dailyCap?: number;
  /** Absolute URL to an image (16:9 recommended) */
  imageUrl?: string;
  /** "active" | "paused". Defaults to "active". */
  status?: "active" | "paused";
}

/* ─── Inline Mongoose schema (no model registry conflict) ─── */

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

/* ─── CLI args ─── */

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const dryRun = args.includes("--dry-run");

if (fileIndex === -1 || !args[fileIndex + 1]) {
  console.error("Usage: import-offers.ts --file <path-to-json> [--dry-run]");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), args[fileIndex + 1]);

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

/* ─── Main ─── */

async function run() {
  const raw = fs.readFileSync(filePath, "utf-8");
  let offers: OfferImport[];

  try {
    offers = JSON.parse(raw);
  } catch {
    console.error("Failed to parse JSON. Make sure the file is a valid JSON array.");
    process.exit(1);
  }

  if (!Array.isArray(offers) || offers.length === 0) {
    console.error("JSON file must be a non-empty array.");
    process.exit(1);
  }

  console.log(`\nLoaded ${offers.length} offers from ${filePath}`);
  if (dryRun) console.log("DRY RUN — no writes will occur.\n");

  await mongoose.connect(MONGODB_URI!);
  console.log("Connected to MongoDB.\n");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const o of offers) {
    // Basic validation
    if (!o.name || !o.network || !o.redirectUrl || !o.payoutUsd) {
      console.warn(`  SKIP  missing required fields: name="${o.name}" network="${o.network}"`);
      skipped++;
      continue;
    }

    if (!o.redirectUrl.includes("{click_id}") && !o.redirectUrl.includes("{clickid}") && !o.redirectUrl.includes("[click_id]")) {
      console.warn(`  WARN  redirectUrl has no {click_id} macro — postback matching will fail: ${o.name}`);
    }

    const doc = {
      name: o.name,
      title: o.title ?? o.name,
      description: o.description ?? "",
      network: o.network,
      externalOfferId: o.externalOfferId ?? null,
      redirectUrl: o.redirectUrl,
      payoutUsd: o.payoutUsd,
      advertiserPayoutUsd: o.advertiserPayoutUsd ?? o.payoutUsd,
      estimatedMinutes: o.estimatedMinutes ?? null,
      category: o.category ?? null,
      badge: o.badge ?? null,
      geoAllow: o.geoAllow ?? [],
      geoDeny: o.geoDeny ?? [],
      deviceTarget: o.deviceTarget ?? "all",
      platforms: o.platforms?.length ? o.platforms : ["web"],
      dailyCap: o.dailyCap ?? null,
      imageUrl: o.imageUrl ?? null,
      status: o.status ?? "active",
    };

    if (dryRun) {
      console.log(`  DRY   ${o.network} / ${o.externalOfferId ?? "no-ext-id"} — ${o.name} ($${o.payoutUsd})`);
      continue;
    }

    try {
      if (o.externalOfferId) {
        // Upsert by network + externalOfferId — safe to re-run
        const result = await OfferModel.findOneAndUpdate(
          { network: o.network, externalOfferId: o.externalOfferId },
          { $set: doc },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        const wasNew = result.createdAt?.getTime() > Date.now() - 5000;
        if (wasNew) {
          console.log(`  INSERT  ${o.network}/${o.externalOfferId} — ${o.name}`);
          inserted++;
        } else {
          console.log(`  UPDATE  ${o.network}/${o.externalOfferId} — ${o.name}`);
          updated++;
        }
      } else {
        // No external ID — always insert
        await OfferModel.create(doc);
        console.log(`  INSERT  ${o.network}/new — ${o.name}`);
        inserted++;
      }
    } catch (err: any) {
      console.error(`  ERROR   ${o.name}: ${err?.message}`);
      errors++;
    }
  }

  console.log(`\nDone. inserted=${inserted} updated=${updated} skipped=${skipped} errors=${errors}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
