// server/db/models/AdvertiserProfile.ts
// PII fields: contactEmail
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type AdvertiserStatus = "active" | "pending" | "suspended";

export interface IAdvertiserProfile extends Document {
  user: Types.ObjectId;
  companyName: string;
  contactEmail?: string;
  websiteUrl?: string;
  postbackUrl?: string;
  status: AdvertiserStatus;
  // SHA-256 hash of the API key — never stored plaintext
  // Full key shown once at generation; subsequent pages show last 8 chars only
  apiKeyHash?: string;
  // Last 8 chars of the API key, for display purposes only
  apiKeySuffix?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvertiserProfileSchema = new Schema<IAdvertiserProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    companyName: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true },
    websiteUrl: { type: String, trim: true },
    postbackUrl: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "pending", "suspended"],
      default: "pending",
      index: true,
    },
    apiKeyHash: { type: String },
    apiKeySuffix: { type: String },
  },
  { timestamps: true }
);

export const AdvertiserProfile: Model<IAdvertiserProfile> =
  (mongoose.models.AdvertiserProfile as Model<IAdvertiserProfile>) ||
  mongoose.model<IAdvertiserProfile>("AdvertiserProfile", AdvertiserProfileSchema);
