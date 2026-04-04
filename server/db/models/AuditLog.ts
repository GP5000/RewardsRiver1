// server/db/models/AuditLog.ts
// Immutable record of all financial and administrative actions.
// Written inside the same MongoDB session/transaction as the action itself.
// Never delete or modify AuditLog entries — they are the source of truth for disputes.
import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAuditLog extends Document {
  action: string;        // e.g. "campaign.approved", "wallet.credited", "publisher.suspended"
  actorId?: Types.ObjectId;
  actorRole?: string;    // "admin" | "publisher" | "advertiser" | "system"
  targetId?: Types.ObjectId;
  targetModel?: string;  // "Campaign", "OfferConversion", "Wallet", "PublisherProfile", etc.
  before?: Record<string, any>;  // snapshot before change
  after?: Record<string, any>;   // snapshot after change
  ip?: string;
  meta?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId },
    actorRole: { type: String },
    targetId: { type: Schema.Types.ObjectId },
    targetModel: { type: String },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    ip: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    // Prevent accidental updates to audit records
    strict: true,
  }
);

AuditLogSchema.index({ targetId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  (mongoose.models.AuditLog as Model<IAuditLog>) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
