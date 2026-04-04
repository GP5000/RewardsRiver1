// src/server/db/models/Wallet.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type WalletOwnerType = "publisher" | "advertiser";

export interface IWallet extends Document {
  ownerType: WalletOwnerType;
  ownerRef: Types.ObjectId; // PublisherProfile or AdvertiserProfile
  currency: "USD";          // for now
  balance: number;          // cents
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    ownerType: { type: String, enum: ["publisher", "advertiser"], required: true, index: true },
    ownerRef: { type: Schema.Types.ObjectId, required: true, index: true },
    currency: { type: String, default: "USD" },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

WalletSchema.index({ ownerType: 1, ownerRef: 1 }, { unique: true });

export const Wallet: Model<IWallet> =
  mongoose.models.Wallet || mongoose.model<IWallet>("Wallet", WalletSchema);
