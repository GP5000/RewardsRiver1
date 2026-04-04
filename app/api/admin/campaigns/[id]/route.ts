// app/api/admin/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { Campaign } from "@/server/db/models/Campaign";
import { approveCampaign } from "@/server/services/campaignService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    await requireAdmin();

    const campaign = await Campaign.findById(id)
      .populate("advertiser", "companyName contactEmail websiteUrl")
      .lean();

    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    const c = campaign as any;
    return NextResponse.json({
      ok: true,
      campaign: {
        id: c._id.toString(),
        name: c.name,
        description: c.description ?? null,
        category: c.category ?? null,
        status: c.status,
        trackingUrl: c.trackingUrl,
        postbackUrl: c.postbackUrl ?? null,
        payoutPerConversionUsd: c.payoutPerConversionCents / 100,
        publisherPayoutUsd: c.publisherPayoutCents / 100,
        totalBudgetUsd: c.totalBudgetCents ? c.totalBudgetCents / 100 : null,
        geoAllow: c.geoAllow,
        geoDeny: c.geoDeny,
        deviceTarget: c.deviceTarget,
        platforms: c.platforms,
        imageUrl: c.imageUrl ?? null,
        attributionWindowDays: c.attributionWindowDays,
        offerId: c.offerId?.toString() ?? null,
        advertiser: {
          id: c.advertiser?._id?.toString() ?? null,
          companyName: c.advertiser?.companyName ?? "Unknown",
          contactEmail: c.advertiser?.contactEmail ?? null,
          websiteUrl: c.advertiser?.websiteUrl ?? null,
        },
        statsClicks: c.statsClicks,
        statsConversions: c.statsConversions,
        createdAt: c.createdAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const { userId } = await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const actorId = new mongoose.Types.ObjectId(userId);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;

    if (action === "approve") {
      const offerId = await approveCampaign(id, actorId, ip);
      return NextResponse.json({ ok: true, offerId });
    }

    if (action === "reject") {
      const campaign = await Campaign.findById(id);
      if (!campaign) {
        return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
      }
      if (campaign.status !== "pending_review") {
        return NextResponse.json(
          { ok: false, error: "Only pending_review campaigns can be rejected" },
          { status: 400 }
        );
      }
      campaign.status = "archived";
      await campaign.save();
      return NextResponse.json({ ok: true, status: "archived" });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
