/**
 * scripts/migrate-db-rename.ts
 * Renames the MongoDB database from "adsriver" to "rewardsriver" without external binaries.
 * Uses the MongoDB Node.js driver's $out aggregation stage to copy each collection.
 *
 * Usage:
 *   npx ts-node scripts/migrate-db-rename.ts          # live run
 *   npx ts-node scripts/migrate-db-rename.ts --dry-run # list collections only
 *
 * ⚠️  Run this BEFORE updating dbName in server/db/connect.ts
 * ⚠️  Ensure no application traffic is hitting the DB during migration
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SOURCE_DB = "adsriver";
const TARGET_DB = "rewardsriver";
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set in .env.local");

  const client = new MongoClient(uri);
  await client.connect();
  console.log(`[migrate] Connected to MongoDB`);

  const sourceDb = client.db(SOURCE_DB);
  const collections = await sourceDb.listCollections().toArray();

  console.log(`[migrate] Found ${collections.length} collections in "${SOURCE_DB}":`);
  for (const col of collections) {
    console.log(`  - ${col.name}`);
  }

  if (DRY_RUN) {
    console.log("[migrate] Dry run — no changes made.");
    await client.close();
    return;
  }

  // Copy each collection using $out to target database
  for (const col of collections) {
    const name = col.name;
    console.log(`[migrate] Copying ${SOURCE_DB}.${name} → ${TARGET_DB}.${name} ...`);
    await sourceDb.collection(name).aggregate([
      { $out: { db: TARGET_DB, coll: name } },
    ]).toArray();
    console.log(`[migrate]   ✓ Done`);
  }

  // Also copy indexes: $out copies documents but not indexes; recreate by running ensureIndexes
  // The Mongoose models will recreate indexes on next app startup — no action needed here.

  console.log(`\n[migrate] All collections copied to "${TARGET_DB}".`);
  console.log(`[migrate] Source database "${SOURCE_DB}" has NOT been dropped.`);
  console.log(`[migrate] After verifying the migration, manually drop "${SOURCE_DB}" with:`);
  console.log(`[migrate]   db.adminCommand({ listDatabases: 1 })  # verify target exists`);
  console.log(`[migrate]   use adsriver; db.dropDatabase()        # in mongosh`);

  await client.close();
}

main().catch((err) => {
  console.error("[migrate] Error:", err);
  process.exit(1);
});
