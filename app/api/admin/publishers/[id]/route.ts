// app/api/admin/publishers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";

import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";
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

/* ─────────────────────────── GET: publisher detail ───────────────────────── */

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const publisherId = id;

    if (!publisherId || !mongoose.isValidObjectId(publisherId)) {
      return NextResponse.json(
        { ok: false, error: "Valid publisher id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const publisherDoc = await PublisherProfile.findById(publisherId)
      .lean()
      .exec();

    if (!publisherDoc) {
      return NextResponse.json(
        { ok: false, error: "Publisher not found" },
        { status: 404 }
      );
    }

    // Basic metrics – we can beef this up later
    const placements = await Placement.find({
      publisherId: publisherId,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()
      .exec();

    const placementsSummary = placements.map((pl) => ({
      id: String(pl._id),
      name: (pl as any).name || "Unnamed placement",
      url: (pl as any).domain || (pl as any).siteUrl || "",
      status: (pl as any).active ? "active" : "inactive",
      createdAt: (pl as any).createdAt
        ? (pl as any).createdAt.toISOString()
        : null,
    }));

    // For now, use zeros for clicks/conv/revenue until we wire proper stats
    const publisher = {
      id: String(publisherDoc._id),
      name: (publisherDoc as any).name || "Unknown publisher",
      email: (publisherDoc as any).email || null,
      website: (publisherDoc as any).website || null,
      status: (publisherDoc as any).status || "pending",
      createdAt: (publisherDoc as any).createdAt
        ? (publisherDoc as any).createdAt.toISOString()
        : null,
      placementsCount: placements.length,
      totalClicks: 0,
      totalConversions: 0,
      totalRevenueUsd: 0,
      balanceUsd: (publisherDoc as any).balanceUsd || 0,
    };

    return NextResponse.json({
      ok: true,
      publisher,
      placements: placementsSummary,
    });
  } catch (err: any) {
    console.error("ADMIN PUBLISHER DETAIL GET ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load publisher" },
      { status: 500 }
    );
  }
}

/* ───────────────────── PATCH: update publisher status ────────────────────── */

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await ctx.params;
    const publisherId = id;

    if (!publisherId || !mongoose.isValidObjectId(publisherId)) {
      return NextResponse.json(
        { ok: false, error: "Valid publisher id is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const body = await req.json().catch(() => null);
    const status = body?.status as
      | "active"
      | "pending"
      | "suspended"
      | undefined;

    if (!status || !["active", "pending", "suspended"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Valid status is required" },
        { status: 400 }
      );
    }

    const updated = await PublisherProfile.findByIdAndUpdate(
      publisherId,
      { status },
      { new: true }
    )
      .lean()
      .exec();

    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Publisher not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: String(updated._id),
        status: (updated as any).status,
      },
    });
  } catch (err: any) {
    console.error("ADMIN PUBLISHER PATCH ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to update publisher" },
      { status: 500 }
    );
  }
}
