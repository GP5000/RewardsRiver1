// server/db/models/ClickLog.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClickLog extends Document {
  publisher: mongoose.Types.ObjectId;         // PublisherProfile._id
  placement?: mongoose.Types.ObjectId | null; // Placement._id (optional)
  offerId?: string | null;                    // internal offer id
  network?: string | null;                    // e.g. "lootably", "adgate"
  clickId: string;                            // unique click identifier
  subId?: string | null;                      // user id / subid
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClickLogSchema = new Schema<IClickLog>(
  {
    publisher: {
      type: Schema.Types.ObjectId,
      ref: "PublisherProfile",
      required: true,
      index: true,
    },
    placement: {
      type: Schema.Types.ObjectId,
      ref: "Placement",
      index: true,
      default: null,
    },
    offerId: {
      type: String,
      index: true,
    },
    network: {
      type: String,
      index: true,
    },
    clickId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subId: {
      type: String,
      index: true,
    },
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

// 🔥 THIS is the runtime export Next is complaining about
export const ClickLog: Model<IClickLog> =
  mongoose.models.ClickLog ||
  mongoose.model<IClickLog>("ClickLog", ClickLogSchema);

// (Optional) helps you see the file definitely loads
// console.log("[Models] ClickLog model initialised");
