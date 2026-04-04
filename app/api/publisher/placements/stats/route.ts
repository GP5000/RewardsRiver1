// app/api/publisher/placements/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/server/db/connect";
import { requirePublisher } from "@/server/auth/publisher";
import { ClickLog } from "@/server/db/models/ClickLog";
import { ConversionLog } from "@/server/db/models/ConversionLog";
import { ImpressionLog } from "@/server/db/models/ImpressionLog";

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

    const { searchParams } = new URL(req.url);

    // ─────────────────────────────────────────
    // Stats window (days)
    // ─────────────────────────────────────────
    const daysParam = searchParams.get("days");
    let windowDays = Number.parseInt(daysParam || "7", 10);
    if (!Number.isFinite(windowDays) || windowDays <= 0 || windowDays > 365) {
      windowDays = 7;
    }

    // Optional: per-placement stats
    const placementIdParam = searchParams.get("placement_id");
    let placementFilter: Record<string, any> = {};
    if (placementIdParam && mongoose.isValidObjectId(placementIdParam)) {
      placementFilter = {
        placement: new mongoose.Types.ObjectId(placementIdParam),
      };
    }

    const now = new Date();
    const since = new Date(
      now.getTime() - windowDays * 24 * 60 * 60 * 1000
    );

    // Base match object for logs in this window
    const baseMatch: Record<string, any> = {
      publisher: publisherObjectId,
      createdAt: { $gte: since },
      ...placementFilter,
    };

    // ─────────────────────────────────────────
    // Parallel aggregation
    // ─────────────────────────────────────────
    const [clicksCount, convAgg, impressionsCount] = await Promise.all([
      ClickLog.countDocuments(baseMatch),

      ConversionLog.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            conversions: { $sum: 1 },
            revenueUsd: { $sum: "$payoutUsd" },
          },
        },
      ]),

      ImpressionLog.countDocuments(baseMatch),
    ]);

    const convTotals = convAgg[0] || {
      conversions: 0,
      revenueUsd: 0,
    };

    const clicks = clicksCount || 0;
    const conversions = convTotals.conversions || 0;
    const revenueUsd = convTotals.revenueUsd || 0;
    const impressions = impressionsCount || 0;

    // EPC: revenue per click
    const epc = clicks > 0 ? revenueUsd / clicks : 0;

    // eCPM: revenue per 1000 impressions
    const ecpm = impressions > 0 ? (revenueUsd / impressions) * 1000 : 0;

    // CR: conversions / clicks
    const cr = clicks > 0 ? (conversions / clicks) * 100 : 0;

    return NextResponse.json(
      {
        ok: true,
        windowDays,
        totals: {
          clicks,
          conversions,
          revenueUsd,
          epc,
          impressions,
          ecpm,
          cr,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PLACEMENT STATS ERROR:", err);
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
