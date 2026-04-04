// app/api/advertiser/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requireAdvertiser } from "@/server/auth/advertiser";
import { Campaign } from "@/server/db/models/Campaign";
import { pauseCampaign, resumeCampaign } from "@/server/services/campaignService";
import { validatePublicUrl } from "@/lib/validateUrl";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const { advertiserId } = await requireAdvertiser();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "Invalid campaign ID" }, { status: 400 });
    }

    const campaign = await Campaign.findOne({
      _id: id,
      advertiser: advertiserId,
    }).lean();

    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      campaign: {
        id: campaign._id.toString(),
        name: campaign.name,
        description: campaign.description ?? null,
        category: campaign.category ?? null,
        status: campaign.status,
        trackingUrl: campaign.trackingUrl,
        postbackUrl: campaign.postbackUrl ?? null,
        // Show secret suffix only — not the full secret after creation
        postbackSecretSuffix: campaign.postbackSecret.slice(-8),
        payoutPerConversionUsd: campaign.payoutPerConversionCents / 100,
        publisherPayoutUsd: campaign.publisherPayoutCents / 100,
        dailyBudgetUsd: campaign.dailyBudgetCents ? campaign.dailyBudgetCents / 100 : null,
        totalBudgetUsd: campaign.totalBudgetCents ? campaign.totalBudgetCents / 100 : null,
        spentTodayUsd: campaign.spentTodayCents / 100,
        spentTotalUsd: campaign.spentTotalCents / 100,
        dailyCap: campaign.dailyCap ?? null,
        geoAllow: campaign.geoAllow,
        geoDeny: campaign.geoDeny,
        deviceTarget: campaign.deviceTarget,
        platforms: campaign.platforms,
        imageUrl: campaign.imageUrl ?? null,
        imageAspectValidated: campaign.imageAspectValidated,
        attributionWindowDays: campaign.attributionWindowDays,
        spendAlertThreshold: campaign.spendAlertThreshold ?? null,
        statsClicks: campaign.statsClicks,
        statsConversions: campaign.statsConversions,
        statsSpendUsd: campaign.statsSpendCents / 100,
        offerId: campaign.offerId?.toString() ?? null,
        startDate: campaign.startDate ?? null,
        endDate: campaign.endDate ?? null,
        createdAt: campaign.createdAt,
      },
    });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const { advertiserId } = await requireAdvertiser();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ ok: false, error: "Invalid campaign ID" }, { status: 400 });
    }

    const campaign = await Campaign.findOne({
      _id: id,
      advertiser: advertiserId,
    });

    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // Handle state machine actions
    if (action === "pause") {
      const actorId = new mongoose.Types.ObjectId(advertiserId);
      await pauseCampaign(id, actorId, "advertiser");
      return NextResponse.json({ ok: true, status: "paused" });
    }

    if (action === "resume") {
      const actorId = new mongoose.Types.ObjectId(advertiserId);
      await resumeCampaign(id, actorId, "advertiser");
      return NextResponse.json({ ok: true, status: "active" });
    }

    if (action === "submit") {
      // Submit draft for review
      if (campaign.status !== "draft") {
        return NextResponse.json(
          { ok: false, error: "Only draft campaigns can be submitted" },
          { status: 400 }
        );
      }
      campaign.status = "pending_review";
      await campaign.save();
      return NextResponse.json({ ok: true, status: "pending_review" });
    }

    // Update editable fields (only when draft or paused)
    if (!["draft", "paused"].includes(campaign.status)) {
      return NextResponse.json(
        { ok: false, error: "Campaign can only be edited when in draft or paused state" },
        { status: 400 }
      );
    }

    const {
      name, description, category, trackingUrl, postbackUrl,
      geoAllow, geoDeny, deviceTarget, platforms, imageUrl,
      attributionWindowDays, spendAlertThreshold, startDate, endDate,
    } = body;

    if (trackingUrl) await validatePublicUrl(trackingUrl);
    if (postbackUrl) await validatePublicUrl(postbackUrl);

    if (name) campaign.name = name;
    if (description !== undefined) campaign.description = description;
    if (category !== undefined) campaign.category = category;
    if (trackingUrl) campaign.trackingUrl = trackingUrl;
    if (postbackUrl !== undefined) campaign.postbackUrl = postbackUrl;
    if (geoAllow) campaign.geoAllow = geoAllow;
    if (geoDeny) campaign.geoDeny = geoDeny;
    if (deviceTarget) campaign.deviceTarget = deviceTarget;
    if (platforms) campaign.platforms = platforms;
    if (imageUrl !== undefined) campaign.imageUrl = imageUrl;
    if (attributionWindowDays) campaign.attributionWindowDays = Number(attributionWindowDays);
    if (spendAlertThreshold !== undefined) campaign.spendAlertThreshold = Number(spendAlertThreshold);
    if (startDate !== undefined) campaign.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) campaign.endDate = endDate ? new Date(endDate) : undefined;

    await campaign.save();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err?.name === "ValidationError") {
      return NextResponse.json({ ok: false, error: err.message }, { status: 422 });
    }
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
