// server/db/models/Offer.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type DeviceTarget = "all" | "desktop" | "mobile";
export type PlatformTarget = "web" | "android" | "ios";
export type OfferStatus = "active" | "paused" | "archived";

export interface IOffer extends Document {
  name: string;
  title: string;
  description?: string;

  network: string;
  externalOfferId?: string | null;
  redirectUrl: string;

  // 🔑 canonical field in DB
  payoutUsd: number;
  advertiserPayoutUsd?: number | null;
  estimatedMinutes?: number | null;

  category?: string | null;
  badge?: string | null;

  geoAllow: string[];
  geoDeny: string[];

  deviceTarget: DeviceTarget;
  platforms: PlatformTarget[];

  placementIds: mongoose.Types.ObjectId[];

  dailyCap?: number | null;
  imageUrl?: string | null;

  status: OfferStatus;

  statsClicks: number;
  statsConversions: number;
  statsEpcUsd: number;
  statsRevPubUsd: number;
  statsRevAdvUsd: number;

  createdAt: Date;
  updatedAt: Date;
}

const OfferSchema = new Schema<IOffer>(
  {
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },

    network: { type: String, required: true },
    externalOfferId: { type: String },
    redirectUrl: { type: String, required: true },

    // ✅ THIS is the only required money field on the offer itself
    payoutUsd: { type: Number, required: true },

    advertiserPayoutUsd: { type: Number },
    estimatedMinutes: { type: Number },

    category: { type: String },
    badge: { type: String },

    geoAllow: { type: [String], default: [] },
    geoDeny: { type: [String], default: [] },

    deviceTarget: {
      type: String,
      enum: ["all", "desktop", "mobile"],
      default: "all",
    },
    platforms: {
      type: [String],
      enum: ["web", "android", "ios"],
      default: ["web"],
    },

    placementIds: {
      type: [Schema.Types.ObjectId],
      ref: "Placement",
      default: [],
    },

    dailyCap: { type: Number },
    imageUrl: { type: String },

    status: {
      type: String,
      enum: ["active", "paused", "archived"],
      default: "active",
    },

    statsClicks: { type: Number, default: 0 },
    statsConversions: { type: Number, default: 0 },
    statsEpcUsd: { type: Number, default: 0 },
    statsRevPubUsd: { type: Number, default: 0 },
    statsRevAdvUsd: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Offer: Model<IOffer> =
  (mongoose.models.Offer as Model<IOffer>) ||
  mongoose.model<IOffer>("Offer", OfferSchema);
