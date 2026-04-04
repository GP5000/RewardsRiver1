// app/api/admin/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { Campaign } from "@/server/db/models/Campaign";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending_review";

    const campaigns = await Campaign.find({ status })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("advertiser", "companyName contactEmail")
      .lean();

    return NextResponse.json({
      ok: true,
      campaigns: campaigns.map((c: any) => ({
        id: c._id.toString(),
        name: c.name,
        category: c.category ?? null,
        status: c.status,
        advertiser: {
          id: c.advertiser?._id?.toString() ?? null,
          companyName: c.advertiser?.companyName ?? "Unknown",
          contactEmail: c.advertiser?.contactEmail ?? null,
        },
        payoutPerConversionUsd: c.payoutPerConversionCents / 100,
        publisherPayoutUsd: c.publisherPayoutCents / 100,
        totalBudgetUsd: c.totalBudgetCents ? c.totalBudgetCents / 100 : null,
        geoAllow: c.geoAllow,
        deviceTarget: c.deviceTarget,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
