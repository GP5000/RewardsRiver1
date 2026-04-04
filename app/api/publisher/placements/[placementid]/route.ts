// app/api/publisher/placements/[placementId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Offer } from "@/server/db/models/Offer";
import { Placement } from "@/server/db/models/Placement";
import { requirePublisher } from "@/server/auth/publisher";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ placementid: string }> }
) {
  try {
    const { placementid: placementId } = await params;

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ placementid: string }> }
) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();
    const { placementid: placementId } = await params;

    if (!placementId || !mongoose.isValidObjectId(placementId)) {
      return NextResponse.json({ ok: false, error: "Invalid placement id" }, { status: 400 });
    }

    const placement = await Placement.findOne({
      _id: new mongoose.Types.ObjectId(placementId),
      publisher: new mongoose.Types.ObjectId(publisherId),
    });

    if (!placement) {
      return NextResponse.json({ ok: false, error: "Placement not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    if (body.marginPercent !== undefined) {
      placement.marginPercent = Math.min(100, Math.max(0, Number(body.marginPercent) || 0));
    }
    if (body.name !== undefined) placement.name = body.name.trim();
    if (body.notes !== undefined) placement.notes = body.notes?.trim() || undefined;
    if (body.url !== undefined) placement.url = body.url?.trim() || undefined;

    await placement.save();

    return NextResponse.json({
      ok: true,
      placement: {
        id: placement._id.toString(),
        name: placement.name,
        marginPercent: placement.marginPercent,
        notes: placement.notes ?? null,
        url: placement.url ?? null,
      },
    });
  } catch (err: any) {
    const message = err?.message || "Internal Server Error";
    return NextResponse.json({ ok: false, error: message }, {
      status: message === "Not authenticated" ? 401 : 500,
    });
  }
}
