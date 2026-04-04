// server/db/models/Campaign.ts
// An advertiser's campaign submission. On admin approval, a linked Offer is created
// and campaign.offerId is populated. The state machine is enforced in campaignService.ts.
//
// State machine (see docs/state-machines.md):
//   draft → pending_review (advertiser submits)
//   pending_review → active (admin approves, creates Offer)
//   pending_review → archived (admin rejects)
//   active → paused (advertiser or admin)
//   paused → active (advertiser or admin)
//   active | paused → archived (admin)
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type CampaignStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "paused"
  | "archived";

export type DeviceTarget = "all" | "desktop" | "mobile";
export type PlatformTarget = "web" | "android" | "ios";

export interface ICampaign extends Document {
  advertiser: Types.ObjectId;

  name: string;
  description?: string;
  category?: string;

  status: CampaignStatus;

  // SSRF-validated on create/update
  trackingUrl: string;
  postbackUrl?: string;
  // Per-campaign secret — validate incoming postbacks against this
  postbackSecret: string;

  // Financials (all in cents)
  payoutPerConversionCents: number;  // what advertiser pays per conversion
  publisherPayoutCents: number;       // what publisher earns (platform keeps difference)

  // Budget (all in cents)
  dailyBudgetCents?: number;
  totalBudgetCents?: number;
  spentTodayCents: number;
  spentTotalCents: number;
  // Lazy daily reset: compare lastResetDate to today before each postback
  lastResetDate?: Date;

  // Caps
  dailyCap?: number;
  conversionsDayCount: number;

  // Targeting
  geoAllow: string[];
  geoDeny: string[];
  deviceTarget: DeviceTarget;
  platforms: PlatformTarget[];

  // Creative — R2 public URL (consistent; not a key)
  imageUrl?: string;
  imageAspectValidated: boolean;

  // Attribution
  attributionWindowDays: number;

  // Spend alerts
  spendAlertThreshold?: number;  // 0–100 (% of totalBudgetCents)
  spendAlertFired: boolean;

  // Scheduling
  startDate?: Date;
  endDate?: Date;

  // Linked Offer (set atomically when admin approves)
  offerId?: Types.ObjectId;

  // Aggregated stats (updated on each conversion)
  statsClicks: number;
  statsConversions: number;
  statsSpendCents: number;

  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema = new Schema<ICampaign>(
  {
    advertiser: { type: Schema.Types.ObjectId, ref: "AdvertiserProfile", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    status: {
      type: String,
      enum: ["draft", "pending_review", "active", "paused", "archived"],
      default: "draft",
      index: true,
    },
    trackingUrl: { type: String, required: true },
    postbackUrl: { type: String },
    postbackSecret: { type: String, required: true },
    payoutPerConversionCents: { type: Number, required: true, min: 1 },
    publisherPayoutCents: { type: Number, required: true, min: 1 },
    dailyBudgetCents: { type: Number },
    totalBudgetCents: { type: Number },
    spentTodayCents: { type: Number, default: 0 },
    spentTotalCents: { type: Number, default: 0 },
    lastResetDate: { type: Date },
    dailyCap: { type: Number },
    conversionsDayCount: { type: Number, default: 0 },
    geoAllow: [{ type: String, uppercase: true }],
    geoDeny: [{ type: String, uppercase: true }],
    deviceTarget: {
      type: String,
      enum: ["all", "desktop", "mobile"],
      default: "all",
    },
    platforms: [{ type: String, enum: ["web", "android", "ios"] }],
    imageUrl: { type: String },
    imageAspectValidated: { type: Boolean, default: false },
    attributionWindowDays: { type: Number, default: 30 },
    spendAlertThreshold: { type: Number, min: 0, max: 100 },
    spendAlertFired: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    offerId: { type: Schema.Types.ObjectId, ref: "Offer" },
    statsClicks: { type: Number, default: 0 },
    statsConversions: { type: Number, default: 0 },
    statsSpendCents: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CampaignSchema.index({ advertiser: 1, status: 1 });
CampaignSchema.index({ status: 1, createdAt: -1 });
CampaignSchema.index({ offerId: 1 });

export const Campaign: Model<ICampaign> =
  (mongoose.models.Campaign as Model<ICampaign>) ||
  mongoose.model<ICampaign>("Campaign", CampaignSchema);
