// server/db/models/WalletTransaction.ts
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type WalletTransactionType =
  | "conversion_credit"   // publisher earned from a conversion
  | "referral_bonus"      // publisher earned from referred publisher's conversion
  | "payout_pending"      // publisher requested withdrawal (debit)
  | "payout_settled"      // payout confirmed paid
  | "payout_refund"       // payout rejected — balance returned
  | "deposit"             // advertiser deposited funds
  | "ad_spend";           // advertiser spent on conversions

export interface IWalletTransaction extends Document {
  wallet: Types.ObjectId;
  type: WalletTransactionType;
  // Cents, positive = credit, negative = debit
  amount: number;
  reference?: string; // e.g. conversionId, payoutId, depositId
  meta?: Record<string, any>;
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    wallet: { type: Schema.Types.ObjectId, ref: "Wallet", required: true },
    type: {
      type: String,
      enum: [
        "conversion_credit",
        "referral_bonus",
        "payout_pending",
        "payout_settled",
        "payout_refund",
        "deposit",
        "ad_spend",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    reference: String,
    meta: Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

WalletTransactionSchema.index({ wallet: 1, createdAt: -1 });

export const WalletTransaction: Model<IWalletTransaction> =
  (mongoose.models.WalletTransaction as Model<IWalletTransaction>) ||
  mongoose.model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);
