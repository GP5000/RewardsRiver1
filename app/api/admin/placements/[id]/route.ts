// app/api/admin/placements/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
import { Placement } from "@/server/db/models/Placement";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function isAdminSession(session: any | null) {
  if (!session?.user) return false;
  const u = session.user as any;
  return (
    u.role === "admin" ||
    u.isAdmin === true ||
    (process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
      u.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL)
  );
}

/* ─────────────────────────── GET: placement detail ────────────────────────── */

/* ─────────────────────────── GET: placement detail ────────────────────────── */

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const placementId = id;

    if (!placementId) {
      return NextResponse.json(
        { ok: false, error: "Valid placement id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const placementDoc = await Placement.findById(placementId)
      .populate("publisher", "name email website") // 🔁 use correct path
      .lean()
      .exec();

    if (!placementDoc) {
      return NextResponse.json(
        { ok: false, error: "Placement not found" },
        { status: 404 }
      );
    }

    const placement = {
      id: String(placementDoc._id),
      name: (placementDoc as any).name || "Unnamed placement",
      domain:
        (placementDoc as any).domain ||
        (placementDoc as any).siteUrl ||
        "",
      status: (placementDoc as any).active ? "active" : "inactive",
      platform: (placementDoc as any).platform || "web",
      device: (placementDoc as any).device || "desktop",
      createdAt: (placementDoc as any).createdAt
        ? (placementDoc as any).createdAt.toISOString()
        : null,
      publisher: (placementDoc as any).publisher
        ? {
            id: String((placementDoc as any).publisher._id),
            name:
              (placementDoc as any).publisher.name || "Unknown publisher",
            email: (placementDoc as any).publisher.email || null,
            website: (placementDoc as any).publisher.website || null,
          }
        : null,
    };

    const stats = {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenueUsd: 0,
      epcUsd: 0,
    };

    return NextResponse.json({ ok: true, placement, stats });
  } catch (err: any) {
    console.error("ADMIN PLACEMENT DETAIL GET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load placement" },
      { status: 500 }
    );
  }
}

/* ───────────────────── PATCH: toggle placement active ────────────────────── */

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const placementId = id;

    if (!placementId) {
      return NextResponse.json(
        { ok: false, error: "Valid placement id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    const active = body?.active;

    if (typeof active !== "boolean") {
      return NextResponse.json(
        { ok: false, error: "Boolean 'active' is required" },
        { status: 400 }
      );
    }

    let updated;
    try {
      // Let Mongoose validate / cast the id
      updated = await Placement.findByIdAndUpdate(
        new mongoose.Types.ObjectId(placementId),
        { active },
        { new: true }
      )
        .lean()
        .exec();
    } catch (e) {
      console.error("INVALID PLACEMENT ID CAST:", placementId, e);
      return NextResponse.json(
        { ok: false, error: "Invalid placement id" },
        { status: 400 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Placement not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: String(updated._id),
        active: (updated as any).active,
      },
    });
  } catch (err: any) {
    console.error("ADMIN PLACEMENT PATCH ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update placement" },
      { status: 500 }
    );
  }
}
