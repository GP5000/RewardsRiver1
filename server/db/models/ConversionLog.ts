// server/db/models/ConversionLog.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IConversionLog extends Document {
  publisherId: mongoose.Types.ObjectId;
  placementId: mongoose.Types.ObjectId;
  revenueUsd?: number;
  payoutUsd?: number;
  clickId?: string;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConversionLogSchema = new Schema<IConversionLog>(
  {
    publisherId: { type: Schema.Types.ObjectId, ref: "PublisherProfile", index: true },
    placementId: { type: Schema.Types.ObjectId, ref: "Placement", index: true },
    revenueUsd: { type: Number },
    payoutUsd: { type: Number },
    clickId: { type: String },
    externalId: { type: String },
  },
  { timestamps: true }
);

export const ConversionLog: Model<IConversionLog> =
  mongoose.models.ConversionLog ||
  mongoose.model<IConversionLog>("ConversionLog", ConversionLogSchema);
