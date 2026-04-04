// server/db/models/SystemSettings.ts
// Singleton collection — only one document ever exists (singleton: true unique field).
// All platform-wide tunable constants live here so they can be edited from the admin
// dashboard without a redeploy. Read via getSystemSettings() which caches the result.
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISystemSettings extends Document {
  singleton: true;
  // Revenue split: publisher gets (100 - platformFeePercent)% of advertiser payout
  platformFeePercent: number;
  // Minimum payout amount in cents ($25 default)
  minPayoutCents: number;
  // Fraud thresholds
  fraudClickVelocityLimit: number;  // clicks per IP per 24h before flagging
  fraudCvrThreshold: number;        // CVR (0–1) above which a publisher is flagged
  fraudIpMismatchThreshold: number; // fraction of conversion IPs mismatching click IPs
  // Referral system
  referralBonusPercent: number;     // % of publisher payout credited to referrer
  referralBonusCapCents: number;    // max referral bonus per conversion in cents
  referralWindowDays: number;       // how long referral relationship is active
  // Conversion auto-approval
  autoApproveConversions: boolean;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    singleton: { type: Boolean, default: true, unique: true, immutable: true },
    platformFeePercent: { type: Number, default: 30 },
    minPayoutCents: { type: Number, default: 2500 },
    fraudClickVelocityLimit: { type: Number, default: 50 },
    fraudCvrThreshold: { type: Number, default: 0.5 },
    fraudIpMismatchThreshold: { type: Number, default: 0.8 },
    referralBonusPercent: { type: Number, default: 5 },
    referralBonusCapCents: { type: Number, default: 5000 },
    referralWindowDays: { type: Number, default: 90 },
    autoApproveConversions: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export const SystemSettings: Model<ISystemSettings> =
  (mongoose.models.SystemSettings as Model<ISystemSettings>) ||
  mongoose.model<ISystemSettings>("SystemSettings", SystemSettingsSchema);

// In-memory cache to avoid a DB hit on every request
let _cached: ISystemSettings | null = null;
let _cachedAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

/** Returns system settings, using cache. Call invalidateSettingsCache() after admin updates. */
export async function getSystemSettings(): Promise<ISystemSettings> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL_MS) return _cached;

  let settings = await SystemSettings.findOne({ singleton: true });
  if (!settings) {
    settings = await SystemSettings.create({ singleton: true });
  }
  _cached = settings;
  _cachedAt = Date.now();
  return settings;
}

export function invalidateSettingsCache(): void {
  _cached = null;
  _cachedAt = 0;
}
