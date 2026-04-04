// app/api/advertiser/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdvertiser } from "@/server/auth/advertiser";
import { Campaign } from "@/server/db/models/Campaign";
import { createCampaign } from "@/server/services/advertiserService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { advertiserId } = await requireAdvertiser();
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;

    const filter: any = { advertiser: advertiserId };
    if (status) filter.status = status;

    const campaigns = await Campaign.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      ok: true,
      campaigns: campaigns.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        status: c.status,
        category: c.category ?? null,
        payoutPerConversionUsd: c.payoutPerConversionCents / 100,
        publisherPayoutUsd: c.publisherPayoutCents / 100,
        totalBudgetUsd: c.totalBudgetCents ? c.totalBudgetCents / 100 : null,
        spentTotalUsd: c.spentTotalCents / 100,
        statsClicks: c.statsClicks,
        statsConversions: c.statsConversions,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { advertiserId } = await requireAdvertiser();

    const body = await req.json().catch(() => ({}));
    const {
      name, description, category, trackingUrl, postbackUrl,
      payoutPerConversionUsd, dailyBudgetUsd, totalBudgetUsd, dailyCap,
      geoAllow, geoDeny, deviceTarget, platforms,
      imageUrl, attributionWindowDays, spendAlertThreshold,
      startDate, endDate,
    } = body;

    if (!name || !trackingUrl || !payoutPerConversionUsd) {
      return NextResponse.json(
        { ok: false, error: "name, trackingUrl, and payoutPerConversionUsd are required" },
        { status: 400 }
      );
    }

    const campaign = await createCampaign({
      advertiserId,
      name,
      description,
      category,
      trackingUrl,
      postbackUrl,
      payoutPerConversionCents: Math.round(Number(payoutPerConversionUsd) * 100),
      dailyBudgetCents: dailyBudgetUsd ? Math.round(Number(dailyBudgetUsd) * 100) : undefined,
      totalBudgetCents: totalBudgetUsd ? Math.round(Number(totalBudgetUsd) * 100) : undefined,
      dailyCap: dailyCap ? Number(dailyCap) : undefined,
      geoAllow: Array.isArray(geoAllow) ? geoAllow : [],
      geoDeny: Array.isArray(geoDeny) ? geoDeny : [],
      deviceTarget: deviceTarget ?? "all",
      platforms: Array.isArray(platforms) ? platforms : ["web"],
      imageUrl,
      attributionWindowDays: attributionWindowDays ? Number(attributionWindowDays) : 30,
      spendAlertThreshold: spendAlertThreshold ? Number(spendAlertThreshold) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return NextResponse.json(
      {
        ok: true,
        campaignId: campaign._id.toString(),
        postbackSecret: campaign.postbackSecret,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.name === "ValidationError") {
      return NextResponse.json({ ok: false, error: err.message }, { status: 422 });
    }
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
