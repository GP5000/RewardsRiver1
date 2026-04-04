// server/db/models/Placement.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type PlacementStatus =
  | "draft"
  | "under_review"
  | "active"
  | "paused"
  | "disabled"
  | "archived";

export interface IPlacement extends Document {
  publisher: mongoose.Types.ObjectId;
  name: string;
  appName?: string;
  platform: "web" | "android" | "ios" | "desktop";
  url?: string;
  primaryGeo?: string;
  notes?: string;

  // 🔹 new status field
  status: PlacementStatus;

  // legacy boolean – keep for now, map from status
  active: boolean;

  // optional stat fields (safe to add)
  impressions?: number;
  clicks?: number;
  conversions?: number;
  revenueUsd?: number;
  epcUsd?: number;

  // IP-level click rate limit override (max clicks/min per IP, 0 = use global default of 30)
  rateLimit?: number;

  // Publisher margin: percentage kept by publisher on top of user payout.
  // e.g. marginPercent=20 on a $100 offer → user sees $80, publisher earns $100.
  marginPercent: number;

  createdAt: Date;
  updatedAt: Date;
}

const PlacementSchema = new Schema<IPlacement>(
  {
    publisher: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      ref: "PublisherProfile",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    appName: {
      type: String,
      trim: true,
    },
    platform: {
      type: String,
      enum: ["web", "android", "ios", "desktop"],
      default: "web",
    },
    url: {
      type: String,
      trim: true,
    },
    primaryGeo: {
      type: String,
      trim: true,
      default: "GLOBAL",
    },
    notes: {
      type: String,
      trim: true,
    },

    // 🔹 status enum
    status: {
      type: String,
      enum: ["draft", "under_review", "active", "paused", "disabled", "archived"],
      default: "under_review",
      index: true,
    },

    // 🔹 keep this for now, but derive default from status
    active: {
      type: Boolean,
      default: false,
      index: true,
    },

    // 🔹 optional aggregates
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenueUsd: { type: Number, default: 0 },
    epcUsd: { type: Number, default: 0 },
    rateLimit: { type: Number, default: 0 },
    marginPercent: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

// OPTIONAL: small shim so status + active stay in sync going forward
PlacementSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.active = this.status === "active";
  } else if (this.isModified("active") && this.isModified("active")) {
    if (this.active && this.status !== "active") this.status = "active";
    if (!this.active && this.status === "active") this.status = "paused";
  }
  next();
});

export const Placement: Model<IPlacement> =
  mongoose.models.Placement ||
  mongoose.model<IPlacement>("Placement", PlacementSchema);
