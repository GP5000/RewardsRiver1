// server/db/models/BlockedIp.ts
// IPs blocked by admin via the fraud monitor. Click endpoint checks this on every request.
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBlockedIp extends Document {
  ip: string;
  reason?: string;
  blockedBy?: mongoose.Types.ObjectId;
  expiresAt?: Date; // null = permanent
  createdAt: Date;
}

const BlockedIpSchema = new Schema<IBlockedIp>(
  {
    ip: { type: String, required: true, unique: true, index: true },
    reason: { type: String },
    blockedBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const BlockedIp: Model<IBlockedIp> =
  (mongoose.models.BlockedIp as Model<IBlockedIp>) ||
  mongoose.model<IBlockedIp>("BlockedIp", BlockedIpSchema);
