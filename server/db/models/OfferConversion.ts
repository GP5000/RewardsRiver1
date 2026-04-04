// server/db/models/OfferConversion.ts
// PII fields: conversionIp (nulled after 90 days by cleanup-old-ips script)
import mongoose, { Schema, Document, Model } from "mongoose";

export type ConversionStatus = "pending" | "approved" | "rejected" | "paid";

export interface IOfferConversion extends Document {
  offer: mongoose.Types.ObjectId;
  placement: mongoose.Types.ObjectId;
  publisher: mongoose.Types.ObjectId;
  // Optional link to Campaign (set for direct advertiser campaigns)
  campaign?: mongoose.Types.ObjectId;
  // Link back to the OfferClick that originated this conversion
  click?: mongoose.Types.ObjectId;
  // UUID matching OfferClick.clickId — unique index enforces idempotency
  clickId?: string;
  subId?: string;
  // What the publisher earns (full amount, credited to publisher wallet)
  payoutUsd: number;
  // What the user sees / gets credited in the publisher's own platform (after margin)
  userPayoutUsd?: number;
  // What the advertiser paid (may differ from payoutUsd due to platform fee)
  advertiserPayoutUsd?: number;
  // State machine: pending → approved → paid (or rejected)
  conversionStatus: ConversionStatus;
  // Human-readable reason set when status is "rejected" (shown to user in wall)
  rejectionReason?: string | null;
  // IP of the postback sender (ad network or advertiser server) — NOT the user's IP
  // Used for fraud: compare with OfferClick.ip (the user's browser IP)
  // PII — nulled after 90 days
  conversionIp?: string | null;
  source?: string;
  raw?: any;
  createdAt: Date;
}

const OfferConversionSchema = new Schema<IOfferConversion>(
  {
    offer: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    placement: { type: Schema.Types.ObjectId, ref: "Placement", required: true },
    publisher: {
      type: Schema.Types.ObjectId,
      ref: "PublisherProfile",
      required: true,
    },
    campaign: { type: Schema.Types.ObjectId, ref: "Campaign" },
    click: { type: Schema.Types.ObjectId, ref: "OfferClick" },
    clickId: { type: String },
    subId: { type: String },
    payoutUsd: { type: Number, required: true },
    userPayoutUsd: { type: Number },
    advertiserPayoutUsd: { type: Number },
    conversionStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
      index: true,
    },
    rejectionReason: { type: String, default: null },
    conversionIp: { type: String, default: null },
    source: { type: String },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Unique index on clickId: prevents duplicate postbacks for the same click
// (E11000 on second insert — caught in postback handler, returns 200 silently)
OfferConversionSchema.index({ clickId: 1 }, { unique: true, sparse: true });
OfferConversionSchema.index({ offer: 1, placement: 1, createdAt: -1 });
OfferConversionSchema.index({ placement: 1, createdAt: -1 });
OfferConversionSchema.index({ publisher: 1, createdAt: -1 });
OfferConversionSchema.index({ subId: 1, createdAt: -1 });
OfferConversionSchema.index({ campaign: 1, createdAt: -1 });
OfferConversionSchema.index({ conversionStatus: 1, createdAt: -1 });

export const OfferConversion: Model<IOfferConversion> =
  (mongoose.models.OfferConversion as Model<IOfferConversion>) ||
  mongoose.model<IOfferConversion>("OfferConversion", OfferConversionSchema);
