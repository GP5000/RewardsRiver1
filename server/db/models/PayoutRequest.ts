// server/db/models/PayoutRequest.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IPayoutRequest extends Document {
  publisher: Types.ObjectId;
  amountCents: number;
  currency: string;              // e.g. "USD"
  method: string;                // "paypal", "crypto", etc.
  destination?: string | null;   // email or address
  status: "pending" | "approved" | "paid" | "rejected";
  createdAt: Date;
  processedAt?: Date | null;
}

const PayoutRequestSchema = new Schema<IPayoutRequest>(
  {
    publisher: {
      type: Schema.Types.ObjectId,
      ref: "PublisherProfile",
      required: true,
      index: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: "USD",
    },
    method: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected"],
      default: "pending",
      index: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const PayoutRequest: Model<IPayoutRequest> =
  mongoose.models.PayoutRequest ||
  mongoose.model<IPayoutRequest>("PayoutRequest", PayoutRequestSchema);
