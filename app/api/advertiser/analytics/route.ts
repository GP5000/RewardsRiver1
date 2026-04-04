// app/api/advertiser/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requireAdvertiser } from "@/server/auth/advertiser";
import { Campaign } from "@/server/db/models/Campaign";
import { OfferConversion } from "@/server/db/models/OfferConversion";
import { OfferClick } from "@/server/db/models/OfferClick";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { advertiserId } = await requireAdvertiser();
    const advertiserObjectId = new mongoose.Types.ObjectId(advertiserId);

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const campaigns = await Campaign.find({ advertiser: advertiserObjectId })
      .select("_id name offerId")
      .lean();

    const offerIds = campaigns.filter((c) => c.offerId).map((c) => c.offerId!);
    const campaignByOffer = new Map(
      campaigns.filter((c) => c.offerId).map((c) => [c.offerId!.toString(), c])
    );

    if (offerIds.length === 0) {
      return NextResponse.json({ ok: true, byCampaign: [], daily: [] });
    }

    const [byCampaignAgg, dailyAgg] = await Promise.all([
      OfferConversion.aggregate([
        { $match: { offer: { $in: offerIds }, createdAt: { $gte: since30d } } },
        {
          $group: {
            _id: "$offer",
            conversions: { $sum: 1 },
            spendUsd: { $sum: "$advertiserPayoutUsd" },
          },
        },
      ]),
      OfferConversion.aggregate([
        { $match: { offer: { $in: offerIds }, createdAt: { $gte: since30d } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            spendUsd: { $sum: "$advertiserPayoutUsd" },
            conversions: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Get click counts per offer
    const clickCountAgg = await OfferClick.aggregate([
      { $match: { offer: { $in: offerIds }, createdAt: { $gte: since30d } } },
      { $group: { _id: "$offer", clicks: { $sum: 1 } } },
    ]);
    const clicksByOffer = new Map(clickCountAgg.map((r) => [r._id.toString(), r.clicks]));

    const byCampaign = byCampaignAgg.map((row) => {
      const campaign = campaignByOffer.get(row._id.toString());
      const clicks = clicksByOffer.get(row._id.toString()) ?? 0;
      return {
        campaignId: campaign?._id?.toString() ?? row._id.toString(),
        campaignName: campaign?.name ?? "Unknown",
        clicks,
        conversions: row.conversions,
        spendUsd: row.spendUsd ?? 0,
        cvr: clicks > 0 ? row.conversions / clicks : 0,
        epc: clicks > 0 ? (row.spendUsd ?? 0) / clicks : 0,
      };
    });

    return NextResponse.json({
      ok: true,
      byCampaign,
      daily: dailyAgg.map((d) => ({
        date: d._id,
        spendUsd: d.spendUsd ?? 0,
        conversions: d.conversions,
      })),
    });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
