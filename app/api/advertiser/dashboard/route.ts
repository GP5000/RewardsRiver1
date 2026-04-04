// app/api/advertiser/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requireAdvertiser } from "@/server/auth/advertiser";
import { Campaign } from "@/server/db/models/Campaign";
import { Wallet } from "@/server/db/models/Wallet";
import { OfferConversion } from "@/server/db/models/OfferConversion";
import { OfferClick } from "@/server/db/models/OfferClick";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { advertiserId } = await requireAdvertiser();
    const advertiserObjectId = new mongoose.Types.ObjectId(advertiserId);

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get all campaign IDs for this advertiser
    const campaigns = await Campaign.find({ advertiser: advertiserObjectId })
      .select("_id name status spentTodayCents spentTotalCents totalBudgetCents dailyBudgetCents statsClicks statsConversions statsSpendCents")
      .lean();

    const campaignIds = campaigns.map((c) => c._id);
    const offerIds = campaigns
      .filter((c) => c.offerId)
      .map((c) => c.offerId!);

    const [wallet, lifetimeConvAgg, last7ConvAgg, dailySpendAgg] = await Promise.all([
      Wallet.findOne({ ownerRef: advertiserObjectId, ownerType: "advertiser" }).lean(),
      offerIds.length > 0
        ? OfferConversion.aggregate([
            { $match: { offer: { $in: offerIds } } },
            { $group: { _id: null, conversions: { $sum: 1 }, spendUsd: { $sum: "$advertiserPayoutUsd" } } },
          ])
        : Promise.resolve([]),
      offerIds.length > 0
        ? OfferConversion.aggregate([
            { $match: { offer: { $in: offerIds }, createdAt: { $gte: since7d } } },
            { $group: { _id: null, conversions: { $sum: 1 }, spendUsd: { $sum: "$advertiserPayoutUsd" } } },
          ])
        : Promise.resolve([]),
      offerIds.length > 0
        ? OfferConversion.aggregate([
            { $match: { offer: { $in: offerIds }, createdAt: { $gte: since30d } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, spendUsd: { $sum: "$advertiserPayoutUsd" }, conversions: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ])
        : Promise.resolve([]),
    ]);

    const lifetimeTotals = lifetimeConvAgg[0] ?? { conversions: 0, spendUsd: 0 };
    const last7Totals = last7ConvAgg[0] ?? { conversions: 0, spendUsd: 0 };

    const totalBudgetCents = campaigns.reduce((s, c) => s + (c.totalBudgetCents ?? 0), 0);
    const spentTotalCents = campaigns.reduce((s, c) => s + c.spentTotalCents, 0);
    const budgetRemainingCents = Math.max(0, totalBudgetCents - spentTotalCents);

    return NextResponse.json({
      ok: true,
      wallet: {
        balanceCents: wallet?.balance ?? 0,
        balanceUsd: (wallet?.balance ?? 0) / 100,
      },
      lifetime: {
        conversions: lifetimeTotals.conversions,
        spendUsd: lifetimeTotals.spendUsd ?? 0,
      },
      last7d: {
        conversions: last7Totals.conversions,
        spendUsd: last7Totals.spendUsd ?? 0,
      },
      budget: {
        totalUsd: totalBudgetCents / 100,
        spentUsd: spentTotalCents / 100,
        remainingUsd: budgetRemainingCents / 100,
        percentUsed: totalBudgetCents > 0 ? Math.round((spentTotalCents / totalBudgetCents) * 100) : 0,
      },
      dailySpend: (dailySpendAgg as any[]).map((d) => ({
        date: d._id,
        spendUsd: d.spendUsd,
        conversions: d.conversions,
      })),
      campaigns: {
        total: campaigns.length,
        active: campaigns.filter((c) => c.status === "active").length,
        pending: campaigns.filter((c) => c.status === "pending_review").length,
        paused: campaigns.filter((c) => c.status === "paused").length,
      },
    });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
