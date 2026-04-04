/**
 * scripts/reconcile-wallet-balances.ts
 * Verifies that each Wallet.balance equals the sum of its WalletTransaction.amount values.
 * Reports discrepancies but does NOT auto-fix — a human must review the AuditLog.
 *
 * Usage:
 *   npx ts-node scripts/reconcile-wallet-balances.ts
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");

  await mongoose.connect(uri, { dbName: "adsriver" });
  console.log("[reconcile-wallets] Connected to MongoDB");

  const { Wallet } = await import("../server/db/models/Wallet");
  const { WalletTransaction } = await import("../server/db/models/WalletTransaction");

  const wallets = await Wallet.find({}).lean();
  console.log(`[reconcile-wallets] Checking ${wallets.length} wallets...`);

  let ok = 0;
  let discrepancies = 0;

  for (const wallet of wallets) {
    const agg = await WalletTransaction.aggregate([
      { $match: { wallet: wallet._id } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const txTotal = agg[0]?.total ?? 0;
    const stored = wallet.balance;

    if (txTotal !== stored) {
      discrepancies++;
      console.error(
        `  ✗ MISMATCH wallet ${wallet._id} (${wallet.ownerType} ${wallet.ownerRef})` +
          ` | stored: ${stored} | tx sum: ${txTotal} | delta: ${stored - txTotal}`
      );
    } else {
      ok++;
    }
  }

  console.log(
    `\n[reconcile-wallets] Done. ${ok} OK, ${discrepancies} discrepancies.`
  );

  if (discrepancies > 0) {
    console.log(
      "Check the AuditLog for affected wallet IDs to determine the source of drift."
    );
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[reconcile-wallets] Error:", err);
  process.exit(1);
});
