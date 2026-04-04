/**
 * server/services/publisherService.ts
 * Publisher registration and payout request logic.
 */

import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "@/server/db/models/User";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";
import { Wallet } from "@/server/db/models/Wallet";
import { PayoutRequest } from "@/server/db/models/PayoutRequest";
import { WalletTransaction } from "@/server/db/models/WalletTransaction";
import { AuditLog } from "@/server/db/models/AuditLog";
import { getSystemSettings } from "@/server/db/models/SystemSettings";

function generateReferralCode(): string {
  return "RR-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

interface RegisterPublisherOpts {
  email: string;
  password: string;
  publisherName: string;
  website?: string;
  referralCode?: string;
}

export async function registerPublisher(opts: RegisterPublisherOpts) {
  const { email, password, publisherName, website, referralCode } = opts;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(password, 10);

  // Generate unique referral code
  let code = generateReferralCode();
  while (await PublisherProfile.findOne({ referralCode: code }).lean()) {
    code = generateReferralCode();
  }

  // Resolve referrer
  let referredBy: mongoose.Types.ObjectId | undefined;
  if (referralCode) {
    const referrer = await PublisherProfile.findOne({ referralCode }).select("_id").lean();
    if (referrer) referredBy = referrer._id as mongoose.Types.ObjectId;
  }

  const user = await User.create({ email: normalizedEmail, passwordHash, role: "publisher" });

  // Generate API key (full key returned once; only hash stored)
  const rawApiKey = crypto.randomBytes(32).toString("hex");
  const apiKeyHash = hashApiKey(rawApiKey);
  const apiKeySuffix = rawApiKey.slice(-8);

  const profile = await PublisherProfile.create({
    user: user._id,
    name: publisherName.trim(),
    website: website?.trim() || undefined,
    status: "active",
    referralCode: code,
    referredBy,
    apiKeyHash,
    apiKeySuffix,
  });

  await Wallet.create({ ownerRef: profile._id, ownerType: "publisher", currency: "USD", balance: 0 });

  return {
    userId: user._id.toString(),
    publisherId: profile._id.toString(),
    // Return full API key once — not stored plaintext
    apiKey: rawApiKey,
  };
}

/**
 * Regenerates the publisher API key. Returns the new key once.
 */
export async function regenerateApiKey(publisherId: string): Promise<string> {
  const rawKey = crypto.randomBytes(32).toString("hex");
  await PublisherProfile.findByIdAndUpdate(publisherId, {
    apiKeyHash: hashApiKey(rawKey),
    apiKeySuffix: rawKey.slice(-8),
  });
  return rawKey;
}
