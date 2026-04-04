// app/api/admin/placements/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
import { Placement } from "@/server/db/models/Placement";

import { PublisherProfile } from "@/server/db/models/PublisherProfile";

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
void PublisherProfile;
// GET /api/admin/placements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const statusFilter = (searchParams.get("status") || "").trim();

    const query: any = {};
    if (q.length > 0) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { url: { $regex: q, $options: "i" } },
        { appName: { $regex: q, $options: "i" } },
      ];
    }

    if (statusFilter === "active") {
      query.active = true;
    } else if (statusFilter === "inactive" || statusFilter === "pending-review") {
      query.active = false;
    }

    const placements = await Placement.find(query)
      .populate("publisher", "name status")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const items = placements.map((p: any) => {
      const publisher = p.publisher || {};
      const status = p.active ? "active" : "inactive";

      return {
        id: String(p._id),
        name: p.name || "Untitled placement",
        key: "", // reserved for future use
        domain: p.url || "",
        status, // "active" | "inactive"
        publisherName: publisher.name || "Unknown publisher",
        publisherId: publisher._id ? String(publisher._id) : null,
        platform: p.platform || "web",
        primaryGeo: p.primaryGeo || "GLOBAL",
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        stats: {
          impressions: p.impressions ?? 0,
          clicks: p.clicks ?? 0,
          conversions: p.conversions ?? 0,
          revenueUsd: p.revenueUsd ?? 0,
          epcUsd: p.epcUsd ?? 0,
        },
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err: any) {
    console.error("ADMIN PLACEMENTS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load placements" },
      { status: 500 }
    );
  }
}
