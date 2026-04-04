// server/db/models/ImpressionLog.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IImpressionLog extends Document {
  publisher: mongoose.Types.ObjectId;
  placement: mongoose.Types.ObjectId;
  userId?: string;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

// Avoid model overwrite
const ImpressionLogSchema = new Schema<IImpressionLog>(
  {
    publisher: {
      type: Schema.Types.ObjectId,
      ref: "PublisherProfile",
      required: true,
    },
    placement: {
      type: Schema.Types.ObjectId,
      ref: "Placement",
      required: true,
    },
    userId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true }
);

// Singleton check
export const ImpressionLog: Model<IImpressionLog> =
  mongoose.models.ImpressionLog ||
  mongoose.model<IImpressionLog>("ImpressionLog", ImpressionLogSchema);

export default ImpressionLog;
