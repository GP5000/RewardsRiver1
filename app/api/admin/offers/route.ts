// app/api/admin/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
import mongoose from "mongoose";
import { Offer } from "@/server/db/models/Offer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function requireAdmin(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user: any = session?.user;
  if (!session || !(user?.role === "admin" || user?.isAdmin === true)) {
    return null;
  }
  return session;
}

// GET /api/admin/offers
export async function GET(req: NextRequest) {
  try {
    const session = await requireAdmin(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const network = searchParams.get("network")?.trim();
    const status = searchParams.get("status")?.trim() as
      | "active"
      | "paused"
      | "archived"
      | undefined;

    const filter: any = {};
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { title: new RegExp(q, "i") },
        { network: new RegExp(q, "i") },
      ];
    }
    if (network) filter.network = network;
    if (status) filter.status = status;

    const items = await Offer.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const mapped = items.map((o: any) => ({
      id: o._id.toString(),
      name: o.name,
      title: o.title,
      network: o.network,
      externalOfferId: o.externalOfferId ?? null,
      status: o.status,
      // ✅ DB -> API: payoutUsd is the same field
      payoutUsd: o.payoutUsd,
      advertiserPayoutUsd: o.advertiserPayoutUsd ?? null,
      estimatedMinutes: o.estimatedMinutes ?? null,
      category: o.category ?? null,
      badge: o.badge ?? null,
      deviceTarget: o.deviceTarget ?? "all",
      geoAllow: o.geoAllow ?? [],
      geoDeny: o.geoDeny ?? [],
      placementIds: (o.placementIds || []).map((id: any) => id.toString()),
      imageUrl: o.imageUrl ?? null,
      stats: {
        clicks: o.statsClicks ?? 0,
        conversions: o.statsConversions ?? 0,
        epcUsd: o.statsEpcUsd ?? 0,
        revPubUsd: o.statsRevPubUsd ?? 0,
        revAdvUsd: o.statsRevAdvUsd ?? 0,
      },
      createdAt: o.createdAt?.toISOString?.() ?? "",
    }));

    return NextResponse.json({ ok: true, items: mapped }, { status: 200 });
  } catch (err: any) {
    console.error("ADMIN OFFERS LIST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/offers
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectDB();
    const body = await req.json();

    const payout =
      typeof body.payoutUsd === "number"
        ? body.payoutUsd
        : Number(body.payoutUsd ?? 0);

    const doc = await Offer.create({
      name: body.name,
      title: body.title,
      description: body.description,
      network: body.network,
      externalOfferId: body.externalOfferId,
      redirectUrl: body.redirectUrl,
      payoutUsd: payout,
      advertiserPayoutUsd: body.advertiserPayoutUsd,
      estimatedMinutes: body.estimatedMinutes,
      category: body.category,
      badge: body.badge,
      geoAllow: body.geoAllow || [],
      geoDeny: body.geoDeny || [],
      deviceTarget: body.deviceTarget || "all",
      platforms:
        body.platforms && body.platforms.length ? body.platforms : ["web"],
      placementIds: (body.placementIds || []).map(
        (id: string) => new mongoose.Types.ObjectId(id)
      ),
      dailyCap: body.dailyCap,
      imageUrl: body.imageUrl,
      status: body.status || "active",
    });

    return NextResponse.json(
      { ok: true, id: doc._id.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("ADMIN OFFERS CREATE ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
