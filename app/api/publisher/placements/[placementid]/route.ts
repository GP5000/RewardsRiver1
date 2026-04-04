// app/api/publisher/placements/[placementId]/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Offer } from "@/server/db/models/Offer";
import { Placement } from "@/server/db/models/Placement";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  req: NextRequest,
  { params }: { params: { placementId: string } }
) {
  try {
    await connectDB();

    const { placementId } = params;

    if (!placementId || !mongoose.isValidObjectId(placementId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid placement id" },
        { status: 400 }
      );
    }

    // Optional: verify placement exists
    const placement = await Placement.findById(placementId).lean();
    if (!placement) {
      return NextResponse.json(
        { ok: false, error: "Placement not found" },
        { status: 404 }
      );
    }

    const placementObjectId = new mongoose.Types.ObjectId(placementId);

    const offers = await Offer.find({
      status: "active",
      $or: [
        { placementIds: { $size: 0 } }, // global offers
        { placementIds: placementObjectId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    const mapped = offers.map((o: any) => ({
      id: o._id.toString(),
      name: o.name,
      title: o.title,                       // 🔑 title always present
      network: o.network,
      externalOfferId: o.externalOfferId ?? null,
      redirectUrl: o.redirectUrl,
      payoutUsd: o.payoutUsd,              // what user/publisher earns
      advertiserPayoutUsd: o.advertiserPayoutUsd ?? null,
      estimatedMinutes: o.estimatedMinutes ?? null,
      category: o.category ?? null,
      badge: o.badge ?? null,
      deviceTarget: o.deviceTarget ?? "all",
      platforms: o.platforms ?? ["web"],
      geoAllow: o.geoAllow ?? [],
      geoDeny: o.geoDeny ?? [],
      imageUrl: o.imageUrl ?? null,
      dailyCap: o.dailyCap ?? null,
      stats: {
        clicks: o.statsClicks ?? 0,
        conversions: o.statsConversions ?? 0,
        epcUsd: o.statsEpcUsd ?? 0,
      },
    }));

    return NextResponse.json(
      { ok: true, offers: mapped },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PUBLISHER OFFERS API ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
