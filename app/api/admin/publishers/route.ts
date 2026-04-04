// app/api/admin/publishers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
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

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !isAdminSession(session)) {
      return NextResponse.json(
        { ok: false, error: "Admin access required" },
        { status: 403 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const status = (searchParams.get("status") || "").trim(); // <- "active" | "pending" | "suspended"

    const filter: any = {};

    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: regex },
        { contactEmail: regex },
        { website: regex },
      ];
    }

    // 🔹 IMPORTANT: filter on the real `status` field, not `accountStatus`
    if (status) {
      filter.status = status;
    }

    const docs = await PublisherProfile.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const items = docs.map((doc: any) => {
      return {
        id: String(doc._id),
        name: doc.name || "Unknown publisher",
        email: doc.contactEmail || null,
        website: doc.website || null,

        // metrics (these will just be 0 until you start aggregating / storing them)
        placementsCount: doc.placementsCount || 0,
        totalClicks: doc.totalClicks || 0,
        totalConversions: doc.totalConversions || 0,
        totalRevenueUsd: doc.totalRevenueUsd || 0,
        balanceUsd: doc.balanceUsd || 0,

        // 🔹 use the real `status` field that the PATCH route updates
        status:
          (doc.status as "active" | "pending" | "suspended" | undefined) ||
          "pending",

        createdAt:
          doc.createdAt instanceof Date
            ? doc.createdAt.toISOString()
            : doc.createdAt || null,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("ADMIN PUBLISHERS LIST ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load publishers" },
      { status: 500 }
    );
  }
}
