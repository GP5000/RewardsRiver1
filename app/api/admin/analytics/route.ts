// app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { OfferConversion } from "@/server/db/models/OfferConversion";
import { OfferClick } from "@/server/db/models/OfferClick";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [lifetimeTotals, last30dDailyAgg, clickCount30d] = await Promise.all([
      OfferConversion.aggregate([
        {
          $group: {
            _id: null,
            totalConversions: { $sum: 1 },
            totalPublisherPayoutUsd: { $sum: "$payoutUsd" },
            totalAdvertiserPayoutUsd: { $sum: "$advertiserPayoutUsd" },
          },
        },
      ]),
      OfferConversion.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            conversions: { $sum: 1 },
            publisherPayoutUsd: { $sum: "$payoutUsd" },
            advertiserPayoutUsd: { $sum: "$advertiserPayoutUsd" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      OfferClick.countDocuments({ createdAt: { $gte: since30d } }),
    ]);

    const totals = lifetimeTotals[0] ?? {
      totalConversions: 0,
      totalPublisherPayoutUsd: 0,
      totalAdvertiserPayoutUsd: 0,
    };

    const platformMarginUsd =
      (totals.totalAdvertiserPayoutUsd ?? 0) - (totals.totalPublisherPayoutUsd ?? 0);

    return NextResponse.json({
      ok: true,
      lifetime: {
        conversions: totals.totalConversions,
        publisherPayoutUsd: totals.totalPublisherPayoutUsd ?? 0,
        advertiserRevenueUsd: totals.totalAdvertiserPayoutUsd ?? 0,
        platformMarginUsd: Math.max(0, platformMarginUsd),
      },
      last30d: {
        clicks: clickCount30d,
        daily: (last30dDailyAgg as any[]).map((d) => ({
          date: d._id,
          conversions: d.conversions,
          publisherPayoutUsd: d.publisherPayoutUsd ?? 0,
          advertiserPayoutUsd: d.advertiserPayoutUsd ?? 0,
          marginUsd: Math.max(0, (d.advertiserPayoutUsd ?? 0) - (d.publisherPayoutUsd ?? 0)),
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
