// server/db/models/OfferClick.ts
// PII fields: ip (nulled after 90 days), userAgent (nulled after 90 days)
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOfferClick extends Document {
  offer: mongoose.Types.ObjectId;
  placement: mongoose.Types.ObjectId;
  publisher: mongoose.Types.ObjectId;
  // Unique UUID generated at click time — used for postback matching
  clickId: string;
  subId?: string;
  device?: string;
  platform?: string;
  // PII — nulled after 90 days by cleanup-old-ips script
  ip?: string | null;
  userAgent?: string | null;
  // Geo derived from IP at click time via geoip-lite
  country?: string | null;
  // Hash of userAgent + screen resolution passed from widget as ?fp=
  deviceFingerprint?: string | null;
  createdAt: Date;
}

const OfferClickSchema = new Schema<IOfferClick>(
  {
    offer: { type: Schema.Types.ObjectId, ref: "Offer", required: true },
    placement: { type: Schema.Types.ObjectId, ref: "Placement", required: true },
    publisher: {
      type: Schema.Types.ObjectId,
      ref: "PublisherProfile",
      required: true,
    },
    clickId: { type: String, required: true },
    subId: { type: String },
    device: { type: String },
    platform: { type: String },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    country: { type: String, default: null },
    deviceFingerprint: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OfferClickSchema.index({ clickId: 1 }, { unique: true });
OfferClickSchema.index({ offer: 1, placement: 1, createdAt: -1 });
OfferClickSchema.index({ placement: 1, createdAt: -1 });
OfferClickSchema.index({ subId: 1, createdAt: -1 });
OfferClickSchema.index({ publisher: 1, createdAt: -1 });
OfferClickSchema.index({ ip: 1, createdAt: -1 });

export const OfferClick: Model<IOfferClick> =
  (mongoose.models.OfferClick as Model<IOfferClick>) ||
  mongoose.model<IOfferClick>("OfferClick", OfferClickSchema);
