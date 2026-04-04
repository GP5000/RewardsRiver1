/**
 * scripts/cleanup-old-ips.ts
 * Nulls PII IP fields in OfferClick and OfferConversion records older than 90 days.
 * Run weekly via cron or admin trigger.
 * Does NOT delete records — only nulls the IP fields.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-old-ips.ts
 *   npx ts-node scripts/cleanup-old-ips.ts --dry-run
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri, { dbName: "adsriver" });
  console.log("[cleanup-ips] Connected to MongoDB");

  const { OfferClick } = await import("../server/db/models/OfferClick");
  const { OfferConversion } = await import("../server/db/models/OfferConversion");

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const clickFilter = {
    createdAt: { $lt: cutoff },
    $or: [{ ip: { $ne: null } }, { userAgent: { $ne: null } }],
  };

  const convFilter = {
    createdAt: { $lt: cutoff },
    conversionIp: { $ne: null },
  };

  const [clickCount, convCount] = await Promise.all([
    OfferClick.countDocuments(clickFilter),
    OfferConversion.countDocuments(convFilter),
  ]);

  console.log(`[cleanup-ips] OfferClick records to null: ${clickCount}`);
  console.log(`[cleanup-ips] OfferConversion records to null: ${convCount}`);

  if (DRY_RUN) {
    console.log("[cleanup-ips] Dry run — no changes made.");
    await mongoose.disconnect();
    return;
  }

  const [clickResult, convResult] = await Promise.all([
    OfferClick.updateMany(clickFilter, { $set: { ip: null, userAgent: null } }),
    OfferConversion.updateMany(convFilter, { $set: { conversionIp: null } }),
  ]);

  console.log(
    `[cleanup-ips] Nulled IPs in ${clickResult.modifiedCount} OfferClick records`
  );
  console.log(
    `[cleanup-ips] Nulled IPs in ${convResult.modifiedCount} OfferConversion records`
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[cleanup-ips] Error:", err);
  process.exit(1);
});
