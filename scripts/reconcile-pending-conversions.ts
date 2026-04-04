/**
 * scripts/reconcile-pending-conversions.ts
 * Finds OfferConversion records stuck in "pending" for more than 48 hours.
 * If SystemSettings.autoApproveConversions is true, approves them automatically.
 * Otherwise, logs them for manual review.
 *
 * Usage:
 *   npx ts-node scripts/reconcile-pending-conversions.ts
 *   npx ts-node scripts/reconcile-pending-conversions.ts --auto-approve
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri, { dbName: "adsriver" });
  console.log("[reconcile] Connected to MongoDB");

  // Lazy import after connection
  const { OfferConversion } = await import("../server/db/models/OfferConversion");
  const { SystemSettings } = await import("../server/db/models/SystemSettings");
  const { approveConversion } = await import("../server/services/conversionService");

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const stuck = await OfferConversion.find({
    conversionStatus: "pending",
    createdAt: { $lt: cutoff },
  })
    .select("_id publisher offer payoutUsd createdAt")
    .lean();

  console.log(`[reconcile] Found ${stuck.length} pending conversions older than 48h`);

  if (stuck.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const settings = await SystemSettings.findOne({ singleton: true });
  const autoApprove = process.argv.includes("--auto-approve") || settings?.autoApproveConversions;

  if (autoApprove) {
    console.log("[reconcile] Auto-approving...");
    const systemActorId = new mongoose.Types.ObjectId();
    for (const conv of stuck) {
      try {
        await approveConversion(conv._id.toString(), systemActorId, "system-reconcile");
        console.log(`  ✓ Approved ${conv._id} (publisher: ${conv.publisher}, $${conv.payoutUsd})`);
      } catch (err: any) {
        console.error(`  ✗ Failed ${conv._id}: ${err.message}`);
      }
    }
  } else {
    console.log("[reconcile] Manual review required for:");
    for (const conv of stuck) {
      console.log(
        `  - ${conv._id} | publisher: ${conv.publisher} | offer: ${conv.offer} | $${conv.payoutUsd} | created: ${conv.createdAt.toISOString()}`
      );
    }
    console.log("\nRun with --auto-approve to approve all, or review in admin dashboard.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[reconcile] Error:", err);
  process.exit(1);
});
