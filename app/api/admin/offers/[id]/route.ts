// app/api/admin/offers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
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

// GET /api/admin/offers/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params; // 👈 unwrap params

    await connectDB();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 }
      );
    }

    const doc: any = await Offer.findById(id).lean();
    if (!doc) {
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    }

    // Map DB -> admin form shape
    return NextResponse.json(
      {
        ok: true,
        item: {
          ...doc,
          id: doc._id.toString(),
          payoutUsd: doc.payoutUsd,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("ADMIN OFFER GET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/offers/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params; // 👈 unwrap params

    await connectDB();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const payout =
      typeof body.payoutUsd === "number"
        ? body.payoutUsd
        : Number(body.payoutUsd ?? 0);

    const update: any = {
      name: body.name,
      title: body.title,
      description: body.description,
      network: body.network,
      externalOfferId: body.externalOfferId,
      redirectUrl: body.redirectUrl,
      payoutUsd: payout, // ✅ canonical DB field
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
        (pid: string) => new mongoose.Types.ObjectId(pid)
      ),
      dailyCap: body.dailyCap,
      imageUrl: body.imageUrl,
      status: body.status || "active",
    };

    await Offer.findByIdAndUpdate(id, update, { new: true });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("ADMIN OFFER UPDATE ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/offers/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin(req);
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params; // 👈 unwrap params

    await connectDB();

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 }
      );
    }

    await Offer.findByIdAndDelete(id);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error("ADMIN OFFER DELETE ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
