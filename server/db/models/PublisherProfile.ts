// server/db/models/PublisherProfile.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type PublisherStatus = "active" | "pending" | "suspended" | "banned";

export interface IPublisherProfile extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  website?: string;

  // 🔹 core status used everywhere
  status: PublisherStatus;

  // 🔹 optional extras
  contactEmail?: string;
  // SHA-256 hash of the API key — never stored plaintext
  apiKeyHash?: string;
  // Last 8 chars of API key for display
  apiKeySuffix?: string;
  postbackUrl?: string;
  // Referral system
  referralCode?: string;
  referredBy?: mongoose.Types.ObjectId;
  allowedDomains?: string[];
  ipWhitelist?: string[];
  trafficSources?: string[];

  // 🔹 aggregate stats (optional, for sorting / UI)
  placementsCount?: number;
  totalClicks?: number;
  totalConversions?: number;
  totalRevenueUsd?: number;
  balanceUsd?: number;
  lastLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const PublisherProfileSchema = new Schema<IPublisherProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "pending", "suspended", "banned"],
      // 🔹 new accounts start UNDER REVIEW
      default: "pending",
      index: true,
    },

    contactEmail: {
      type: String,
      trim: true,
    },
    apiKeyHash: { type: String },
    apiKeySuffix: { type: String },
    postbackUrl: {
      type: String,
      trim: true,
    },
    allowedDomains: [
      {
        type: String,
        trim: true,
      },
    ],
    ipWhitelist: [
      {
        type: String,
        trim: true,
      },
    ],
    trafficSources: [
      {
        type: String,
        trim: true,
      },
    ],

    // 🔹 optional aggregates – safe even if you never set them yet
    placementsCount: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    totalRevenueUsd: { type: Number, default: 0 },
    balanceUsd: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    referralCode: { type: String, index: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "PublisherProfile" },
  },
  { timestamps: true }
);

export const PublisherProfile: Model<IPublisherProfile> =
  mongoose.models.PublisherProfile ||
  mongoose.model<IPublisherProfile>("PublisherProfile", PublisherProfileSchema);
