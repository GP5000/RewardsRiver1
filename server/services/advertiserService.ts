/**
 * server/services/advertiserService.ts
 * Advertiser registration and campaign submission logic.
 */

import mongoose from "mongoose";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { User } from "@/server/db/models/User";
import { AdvertiserProfile } from "@/server/db/models/AdvertiserProfile";
import { Wallet } from "@/server/db/models/Wallet";
import { Campaign } from "@/server/db/models/Campaign";
import { getSystemSettings } from "@/server/db/models/SystemSettings";
import { validatePublicUrl } from "@/lib/validateUrl";
import { generatePostbackSecret } from "./campaignService";

function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

interface RegisterAdvertiserOpts {
  email: string;
  password: string;
  companyName: string;
  websiteUrl?: string;
}

export async function registerAdvertiser(opts: RegisterAdvertiserOpts) {
  const { email, password, companyName, websiteUrl } = opts;
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail }).lean();
  if (existingUser) throw new Error("EMAIL_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(password, 10);

  const rawApiKey = crypto.randomBytes(32).toString("hex");
  const apiKeyHash = hashApiKey(rawApiKey);
  const apiKeySuffix = rawApiKey.slice(-8);

  const user = await User.create({ email: normalizedEmail, passwordHash, role: "advertiser" });

  const profile = await AdvertiserProfile.create({
    user: user._id,
    companyName: companyName.trim(),
    websiteUrl: websiteUrl?.trim(),
    status: "pending",
    apiKeyHash,
    apiKeySuffix,
  });

  await Wallet.create({ ownerRef: profile._id, ownerType: "advertiser", currency: "USD", balance: 0 });

  return {
    userId: user._id.toString(),
    advertiserId: profile._id.toString(),
    apiKey: rawApiKey,
  };
}

interface CreateCampaignOpts {
  advertiserId: string;
  name: string;
  description?: string;
  category?: string;
  trackingUrl: string;
  postbackUrl?: string;
  payoutPerConversionCents: number;
  dailyBudgetCents?: number;
  totalBudgetCents?: number;
  dailyCap?: number;
  geoAllow?: string[];
  geoDeny?: string[];
  deviceTarget?: "all" | "desktop" | "mobile";
  platforms?: string[];
  imageUrl?: string;
  attributionWindowDays?: number;
  spendAlertThreshold?: number;
  startDate?: Date;
  endDate?: Date;
}

export async function createCampaign(opts: CreateCampaignOpts) {
  const settings = await getSystemSettings();

  // SSRF validation on tracking URLs
  await validatePublicUrl(opts.trackingUrl);
  if (opts.postbackUrl) await validatePublicUrl(opts.postbackUrl);

  const publisherPayoutCents = Math.floor(
    opts.payoutPerConversionCents * (1 - settings.platformFeePercent / 100)
  );

  if (publisherPayoutCents >= opts.payoutPerConversionCents) {
    throw new Error("INVALID_PAYOUT: publisher payout must be less than advertiser payout");
  }

  const campaign = await Campaign.create({
    advertiser: new mongoose.Types.ObjectId(opts.advertiserId),
    name: opts.name,
    description: opts.description,
    category: opts.category,
    status: "draft",
    trackingUrl: opts.trackingUrl,
    postbackUrl: opts.postbackUrl,
    postbackSecret: generatePostbackSecret(),
    payoutPerConversionCents: opts.payoutPerConversionCents,
    publisherPayoutCents,
    dailyBudgetCents: opts.dailyBudgetCents,
    totalBudgetCents: opts.totalBudgetCents,
    dailyCap: opts.dailyCap,
    geoAllow: opts.geoAllow ?? [],
    geoDeny: opts.geoDeny ?? [],
    deviceTarget: opts.deviceTarget ?? "all",
    platforms: opts.platforms ?? ["web"],
    imageUrl: opts.imageUrl,
    attributionWindowDays: opts.attributionWindowDays ?? 30,
    spendAlertThreshold: opts.spendAlertThreshold,
  });

  return campaign;
}

/**
 * Regenerates the advertiser API key. Returns the new key once.
 */
export async function regenerateApiKey(advertiserId: string): Promise<string> {
  const rawKey = crypto.randomBytes(32).toString("hex");
  await AdvertiserProfile.findByIdAndUpdate(advertiserId, {
    apiKeyHash: hashApiKey(rawKey),
    apiKeySuffix: rawKey.slice(-8),
  });
  return rawKey;
}
