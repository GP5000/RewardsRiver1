/**
 * server/services/conversionService.ts
 * Core conversion lifecycle: record postback, approve, reject.
 * All money operations delegate to walletService and run inside transactions.
 *
 * State machine (enforced here, documented in docs/state-machines.md):
 *   pending → approved | rejected
 *   approved → paid (informational — set when associated payout is paid)
 */

import mongoose from "mongoose";
import { OfferConversion, ConversionStatus } from "@/server/db/models/OfferConversion";
import { AuditLog } from "@/server/db/models/AuditLog";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";
import { creditWallet } from "./walletService";

const ALLOWED_TRANSITIONS: Record<ConversionStatus, ConversionStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["paid"],
  rejected: [],
  paid: [],
};

function assertTransition(from: ConversionStatus, to: ConversionStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`INVALID_TRANSITION: ${from} → ${to}`);
  }
}

/**
 * Approves a conversion: credits publisher wallet and writes audit log.
 * Idempotent: if already approved, returns without error.
 */
export async function approveConversion(
  conversionId: string,
  actorId: mongoose.Types.ObjectId,
  ip?: string
): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const conversion = await OfferConversion.findById(conversionId).session(session);
      if (!conversion) throw new Error("CONVERSION_NOT_FOUND");

      // Idempotency: if already approved, no-op
      if (conversion.conversionStatus === "approved") return;

      assertTransition(conversion.conversionStatus, "approved");

      conversion.conversionStatus = "approved";
      await conversion.save({ session });

      // Credit publisher wallet
      await creditWallet(
        {
          ownerRef: conversion.publisher as mongoose.Types.ObjectId,
          ownerType: "publisher",
          amountCents: Math.round(conversion.payoutUsd * 100),
          type: "conversion_credit",
          reference: conversionId,
          actorId,
          actorRole: "admin",
          ip,
        },
        session
      );

      await AuditLog.create(
        [{
          action: "conversion.approved",
          actorId,
          actorRole: "admin",
          targetId: conversion._id,
          targetModel: "OfferConversion",
          before: { conversionStatus: "pending" },
          after: { conversionStatus: "approved" },
          ip,
        }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  // Fire publisher postback URL (best-effort, outside transaction)
  try {
    const conversion = await OfferConversion.findById(conversionId).lean();
    if (conversion) {
      const publisher = await PublisherProfile.findOne({ user: conversion.publisher }).lean() as any;
      if (publisher?.postbackUrl) {
        const url = publisher.postbackUrl
          .replace(/\{sub_id\}/gi, conversion.subId ?? "")
          .replace(/\{user_id\}/gi, conversion.subId ?? "")
          .replace(/\{click_id\}/gi, conversion.clickId ?? "")
          .replace(/\{payout\}/gi, String(conversion.payoutUsd ?? ""))
          .replace(/\{amount\}/gi, String(conversion.payoutUsd ?? ""));
        await fetch(url, { signal: AbortSignal.timeout(5000) }).catch(() => {});
      }
    }
  } catch {
    // Non-blocking — publisher postback failure does not affect approval
  }
}

/**
 * Rejects a conversion. Idempotent: if already rejected, returns without error.
 */
export async function rejectConversion(
  conversionId: string,
  actorId: mongoose.Types.ObjectId,
  reason?: string,
  ip?: string
): Promise<void> {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const conversion = await OfferConversion.findById(conversionId).session(session);
      if (!conversion) throw new Error("CONVERSION_NOT_FOUND");

      if (conversion.conversionStatus === "rejected") return;

      assertTransition(conversion.conversionStatus, "rejected");

      conversion.conversionStatus = "rejected";
      if (reason) conversion.rejectionReason = reason;
      await conversion.save({ session });

      await AuditLog.create(
        [{
          action: "conversion.rejected",
          actorId,
          actorRole: "admin",
          targetId: conversion._id,
          targetModel: "OfferConversion",
          before: { conversionStatus: "pending" },
          after: { conversionStatus: "rejected" },
          meta: { reason },
          ip,
        }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
}
