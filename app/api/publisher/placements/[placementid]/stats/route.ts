// app/api/publisher/placements/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
import { Placement } from "@/server/db/models/Placement";
import { OfferClick } from "@/server/db/models/OfferClick";
import { OfferConversion } from "@/server/db/models/OfferConversion";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user: any = session?.user;

    if (!session || !user?.publisherId) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") || 7);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const publisherId = new mongoose.Types.ObjectId(user.publisherId);

    const placements = await Placement.find({ publisher: publisherId })
      .select("_id name")
      .lean();

    if (!placements.length) {
      return NextResponse.json(
        { ok: true, items: [] },
        { status: 200 }
      );
    }

    const placementIds = placements.map((p) => p._id);

    const clicksAgg = await OfferClick.aggregate([
      {
        $match: {
          publisher: publisherId,
          placement: { $in: placementIds },
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: "$placement",
          clicks: { $sum: 1 },
        },
      },
    ]);

    const convAgg = await OfferConversion.aggregate([
      {
        $match: {
          publisher: publisherId,
          placement: { $in: placementIds },
          createdAt: { $gte: since },
          approved: true,
        },
      },
      {
        $group: {
          _id: "$placement",
          conversions: { $sum: 1 },
          revPubUsd: { $sum: "$rewardUsd" },
        },
      },
    ]);

    const clicksMap = new Map<string, number>();
    for (const row of clicksAgg) {
      clicksMap.set(String(row._id), row.clicks);
    }
    const convMap = new Map<
      string,
      { conversions: number; revPubUsd: number }
    >();
    for (const row of convAgg) {
      convMap.set(String(row._id), {
        conversions: row.conversions,
        revPubUsd: row.revPubUsd,
      });
    }

    const items = placements.map((p) => {
      const c = clicksMap.get(String(p._id)) || 0;
      const conv = convMap.get(String(p._id));
      const conversions = conv?.conversions || 0;
      const revPubUsd = conv?.revPubUsd || 0;

      const epc = c > 0 ? revPubUsd / c : 0;
      const ecpm = c > 0 ? (revPubUsd / c) * 1000 : 0; // crude but fine for now

      return {
        id: p._id.toString(),
        name: p.name,
        clicks: c,
        conversions,
        revPubUsd,
        epcUsd: epc,
        ecpmUsd: ecpm,
      };
    });

    return NextResponse.json(
      { ok: true, items },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PUBLISHER PLACEMENTS STATS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
