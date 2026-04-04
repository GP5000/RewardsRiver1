/**
 * server/services/campaignService.ts
 * Campaign lifecycle: approve (→ creates Offer), pause, resume.
 * State machine enforced here (see docs/state-machines.md).
 *
 * Idempotency rule: if an admin action targets an entity already in the target
 * state, return without error (no duplicate Offer creation, no error).
 */

import mongoose from "mongoose";
import crypto from "crypto";
import { Campaign, CampaignStatus } from "@/server/db/models/Campaign";
import { Offer } from "@/server/db/models/Offer";
import { AuditLog } from "@/server/db/models/AuditLog";

const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["pending_review"],
  pending_review: ["active", "archived"],
  active: ["paused", "archived"],
  paused: ["active", "archived"],
  archived: [],
};

function assertTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`INVALID_TRANSITION: ${from} → ${to}`);
  }
}

/**
 * Admin approves a campaign: atomically creates an Offer and links it.
 * Idempotent: if already active with offerId set, returns existing offerId.
 */
export async function approveCampaign(
  campaignId: string,
  actorId: mongoose.Types.ObjectId,
  ip?: string
): Promise<string> {
  const session = await mongoose.startSession();
  let offerId: string;
  try {
    await session.withTransaction(async () => {
      const campaign = await Campaign.findById(campaignId).session(session);
      if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

      // Idempotency: already active
      if (campaign.status === "active" && campaign.offerId) {
        offerId = campaign.offerId.toString();
        return;
      }

      assertTransition(campaign.status, "active");

      const [offer] = await Offer.create(
        [{
          name: campaign.name,
          title: campaign.name,
          description: campaign.description,
          network: "direct",
          redirectUrl: campaign.trackingUrl,
          payoutUsd: campaign.publisherPayoutCents / 100,
          advertiserPayoutUsd: campaign.payoutPerConversionCents / 100,
          geoAllow: campaign.geoAllow,
          geoDeny: campaign.geoDeny,
          deviceTarget: campaign.deviceTarget,
          platforms: campaign.platforms,
          imageUrl: campaign.imageUrl,
          dailyCap: campaign.dailyCap,
          category: campaign.category,
          status: "active",
        }],
        { session }
      );

      offerId = (offer._id as mongoose.Types.ObjectId).toString();
      campaign.offerId = offer._id as mongoose.Types.ObjectId;
      campaign.status = "active";
      await campaign.save({ session });

      await AuditLog.create(
        [{
          action: "campaign.approved",
          actorId,
          actorRole: "admin",
          targetId: campaign._id,
          targetModel: "Campaign",
          before: { status: campaign.status },
          after: { status: "active", offerId },
          ip,
        }],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  return offerId!;
}

/**
 * Pauses a campaign (advertiser or admin). Also pauses the linked Offer.
 * Idempotent: if already paused, returns without error.
 */
export async function pauseCampaign(
  campaignId: string,
  actorId: mongoose.Types.ObjectId,
  actorRole: string,
  ip?: string
): Promise<void> {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  if (campaign.status === "paused") return;

  assertTransition(campaign.status, "paused");

  campaign.status = "paused";
  await campaign.save();

  if (campaign.offerId) {
    await Offer.findByIdAndUpdate(campaign.offerId, { status: "paused" });
  }

  await AuditLog.create({
    action: "campaign.paused",
    actorId,
    actorRole,
    targetId: campaign._id,
    targetModel: "Campaign",
    before: { status: "active" },
    after: { status: "paused" },
    ip,
  });
}

/**
 * Resumes a paused campaign. Validates budget/dates before reactivating.
 * Idempotent: if already active, returns without error.
 */
export async function resumeCampaign(
  campaignId: string,
  actorId: mongoose.Types.ObjectId,
  actorRole: string,
  ip?: string
): Promise<void> {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  if (campaign.status === "active") return;

  assertTransition(campaign.status, "active");

  // Validate budget still has room
  if (
    campaign.totalBudgetCents !== undefined &&
    campaign.spentTotalCents >= campaign.totalBudgetCents
  ) {
    throw new Error("BUDGET_EXHAUSTED");
  }

  // Validate end date
  if (campaign.endDate && campaign.endDate < new Date()) {
    throw new Error("CAMPAIGN_EXPIRED");
  }

  campaign.status = "active";
  await campaign.save();

  if (campaign.offerId) {
    await Offer.findByIdAndUpdate(campaign.offerId, { status: "active" });
  }

  await AuditLog.create({
    action: "campaign.resumed",
    actorId,
    actorRole,
    targetId: campaign._id,
    targetModel: "Campaign",
    before: { status: "paused" },
    after: { status: "active" },
    ip,
  });
}

/** Generates a secure per-campaign postback secret. */
export function generatePostbackSecret(): string {
  return crypto.randomBytes(16).toString("hex");
}
