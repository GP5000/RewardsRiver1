// app/api/publisher/analytics/geo/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requirePublisher } from "@/server/auth/publisher";
import { OfferClick } from "@/server/db/models/OfferClick";
import { OfferConversion } from "@/server/db/models/OfferConversion";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();
    const publisherObjectId = new mongoose.Types.ObjectId(publisherId);

    const url = new URL(req.url);
    const days = Math.min(parseInt(url.searchParams.get("days") ?? "30"), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [clicksByCountry, conversionsByCountry] = await Promise.all([
      OfferClick.aggregate([
        { $match: { publisher: publisherObjectId, createdAt: { $gte: since }, country: { $ne: null } } },
        { $group: { _id: "$country", clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 50 },
      ]),
      OfferConversion.aggregate([
        { $match: { publisher: publisherObjectId, createdAt: { $gte: since } } },
        {
          $lookup: {
            from: "offerclicks",
            localField: "click",
            foreignField: "_id",
            as: "clickDoc",
          },
        },
        { $unwind: { path: "$clickDoc", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ["$clickDoc.country", "Unknown"] },
            conversions: { $sum: 1 },
            revenueUsd: { $sum: "$payoutUsd" },
          },
        },
        { $sort: { conversions: -1 } },
        { $limit: 50 },
      ]),
    ]);

    // Merge into unified country map
    const countryMap = new Map<string, { country: string; clicks: number; conversions: number; revenueUsd: number }>();

    for (const row of clicksByCountry) {
      const country = row._id ?? "Unknown";
      countryMap.set(country, {
        country,
        clicks: row.clicks,
        conversions: 0,
        revenueUsd: 0,
      });
    }

    for (const row of conversionsByCountry) {
      const country = row._id ?? "Unknown";
      const existing = countryMap.get(country) ?? { country, clicks: 0, conversions: 0, revenueUsd: 0 };
      existing.conversions = row.conversions;
      existing.revenueUsd = row.revenueUsd ?? 0;
      countryMap.set(country, existing);
    }

    const rows = Array.from(countryMap.values())
      .map((r) => ({
        ...r,
        cvr: r.clicks > 0 ? +(r.conversions / r.clicks).toFixed(4) : 0,
        epc: r.clicks > 0 ? +(r.revenueUsd / r.clicks).toFixed(4) : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    return NextResponse.json({ ok: true, days, rows });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
