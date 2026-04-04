import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/server/db/connect";
import { OfferClick } from "@/server/db/models/OfferClick";
import { OfferConversion } from "@/server/db/models/OfferConversion";
import { Wallet } from "@/server/db/models/Wallet";
import { Placement } from "@/server/db/models/Placement";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";
import { ImpressionLog } from "@/server/db/models/ImpressionLog";
import { requirePublisher } from "@/server/auth/publisher";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { publisherId } = await requirePublisher();

    if (
      !publisherId ||
      typeof publisherId !== "string" ||
      !mongoose.isValidObjectId(publisherId)
    ) {
      throw new Error(
        `Invalid publisherId from requirePublisher: ${String(publisherId)}`
      );
    }

    const publisherObjectId = new mongoose.Types.ObjectId(publisherId);
    const url = new URL(req.url);
    const placementIdParam = url.searchParams.get("placement_id");

    let placementFilter: { placement?: mongoose.Types.ObjectId } = {};
    let selectedPlacement: { id: string; name: string } | null = null;

    if (placementIdParam && mongoose.isValidObjectId(placementIdParam)) {
      const placementDoc = await Placement.findOne({
        _id: new mongoose.Types.ObjectId(placementIdParam),
        publisher: publisherObjectId,
      })
        .select("_id name")
        .lean();

      if (placementDoc) {
        placementFilter.placement = placementDoc._id as mongoose.Types.ObjectId;
        selectedPlacement = {
          id: placementDoc._id.toString(),
          name: placementDoc.name,
        };
      }
    }

    const now = new Date();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const since30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const placementMatchClause = placementFilter.placement
      ? { placement: placementFilter.placement }
      : {};

    const [placementsList, walletDoc, publisherDoc] = await Promise.all([
      Placement.find({ publisher: publisherObjectId })
        .select("_id name")
        .sort({ createdAt: -1 })
        .lean(),
      Wallet.findOne({ ownerRef: publisherObjectId, ownerType: "publisher" }).lean(),
      PublisherProfile.findById(publisherId).select("name").lean(),
    ]);

    // Lifetime aggregates — using OfferClick + OfferConversion (canonical models)
    const [lifetimeClicksNum, lifetimeConvAgg, lifetimeImpressions] =
      await Promise.all([
        OfferClick.countDocuments({
          publisher: publisherObjectId,
          ...placementMatchClause,
        }),
        OfferConversion.aggregate([
          {
            $match: {
              publisher: publisherObjectId,
              ...placementMatchClause,
            },
          },
          {
            $group: {
              _id: null,
              conversions: { $sum: 1 },
              revenueUsd: { $sum: "$payoutUsd" },
            },
          },
        ]),
        ImpressionLog.countDocuments({
          publisher: publisherObjectId,
          ...placementMatchClause,
        }),
      ]);

    // Last 7 days aggregates
    const [last7ClicksNum, last7ConvAgg, last7Impressions] = await Promise.all([
      OfferClick.countDocuments({
        publisher: publisherObjectId,
        createdAt: { $gte: since7d },
        ...placementMatchClause,
      }),
      OfferConversion.aggregate([
        {
          $match: {
            publisher: publisherObjectId,
            createdAt: { $gte: since7d },
            ...placementMatchClause,
          },
        },
        {
          $group: {
            _id: null,
            conversions: { $sum: 1 },
            revenueUsd: { $sum: "$payoutUsd" },
          },
        },
      ]),
      ImpressionLog.countDocuments({
        publisher: publisherObjectId,
        createdAt: { $gte: since7d },
        ...placementMatchClause,
      }),
    ]);

    const lifetimeConvTotals = lifetimeConvAgg[0] || { conversions: 0, revenueUsd: 0 };
    const last7ConvTotals = last7ConvAgg[0] || { conversions: 0, revenueUsd: 0 };

    const lifetimeConversions = lifetimeConvTotals.conversions || 0;
    const lifetimeRevenue = lifetimeConvTotals.revenueUsd || 0;
    const lifetimeImpressionsNum = lifetimeImpressions || 0;

    const last7Conversions = last7ConvTotals.conversions || 0;
    const last7Revenue = last7ConvTotals.revenueUsd || 0;
    const last7ImpressionsNum = last7Impressions || 0;

    const lifetimeEpc = lifetimeClicksNum > 0 ? lifetimeRevenue / lifetimeClicksNum : 0;
    const lifetimeCr = lifetimeClicksNum > 0 ? (lifetimeConversions / lifetimeClicksNum) * 100 : 0;
    const lifetimeEcpm = lifetimeImpressionsNum > 0 ? (lifetimeRevenue / lifetimeImpressionsNum) * 1000 : 0;

    const last7Epc = last7ClicksNum > 0 ? last7Revenue / last7ClicksNum : 0;
    const last7Cr = last7ClicksNum > 0 ? (last7Conversions / last7ClicksNum) * 100 : 0;
    const last7Ecpm = last7ImpressionsNum > 0 ? (last7Revenue / last7ImpressionsNum) * 1000 : 0;

    // Daily revenue over last 30 days
    const dailyRevenueAgg = await OfferConversion.aggregate([
      {
        $match: {
          publisher: publisherObjectId,
          createdAt: { $gte: since30d },
          ...placementMatchClause,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenueUsd: { $sum: "$payoutUsd" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyRevenue = dailyRevenueAgg.map((d: any) => ({
      date: d._id,
      revenueUsd: d.revenueUsd,
    }));

    // Top 10 offers by revenue in last 30 days
    const topOffersAgg = await OfferConversion.aggregate([
      {
        $match: {
          publisher: publisherObjectId,
          createdAt: { $gte: since30d },
          ...placementMatchClause,
        },
      },
      {
        $group: {
          _id: "$offer",
          revenueUsd: { $sum: "$payoutUsd" },
          conversions: { $sum: 1 },
        },
      },
      { $sort: { revenueUsd: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "offers",
          localField: "_id",
          foreignField: "_id",
          as: "offerDoc",
        },
      },
      { $unwind: { path: "$offerDoc", preserveNullAndEmptyArrays: true } },
    ]);

    const topOffers = topOffersAgg.map((o: any) => ({
      offerId: o._id?.toString(),
      name: o.offerDoc?.name ?? "Unknown Offer",
      revenueUsd: o.revenueUsd,
      conversions: o.conversions,
    }));

    const wallet = {
      balanceCents: walletDoc?.balance ?? 0,
      balanceUsd: (walletDoc?.balance ?? 0) / 100,
    };

    return NextResponse.json(
      {
        ok: true,
        publisher: {
          id: publisherId,
          name: publisherDoc?.name ?? null,
        },
        lifetime: {
          clicks: lifetimeClicksNum,
          conversions: lifetimeConversions,
          revenueUsd: lifetimeRevenue,
          impressions: lifetimeImpressionsNum,
          epc: lifetimeEpc,
          ecpm: lifetimeEcpm,
          cr: lifetimeCr,
        },
        last7d: {
          clicks: last7ClicksNum,
          conversions: last7Conversions,
          revenueUsd: last7Revenue,
          impressions: last7ImpressionsNum,
          epc: last7Epc,
          ecpm: last7Ecpm,
          cr: last7Cr,
        },
        wallet,
        placements: {
          count: placementsList.length,
          items: placementsList.map((p) => ({
            id: p._id.toString(),
            name: p.name,
          })),
          selected: selectedPlacement,
        },
        dailyRevenue,
        topOffers,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PUBLISHER OVERVIEW ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal Server Error",
        message: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
