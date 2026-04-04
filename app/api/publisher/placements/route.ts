import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Placement } from "@/server/db/models/Placement";
import { requirePublisher } from "@/server/auth/publisher";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/* --------------------------------------------
   GET /api/publisher/placements
   -------------------------------------------- */
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher(); // ALWAYS profile._id

    const placements = await Placement.find({
      publisher: new mongoose.Types.ObjectId(publisherId),
    })
      .sort({ createdAt: -1 })
      .lean();

    const items = placements.map((p: any) => ({
      id: p._id.toString(),
      name: p.name,
      appName: p.appName ?? null,
      platform: p.platform ?? "web",
      url: p.url ?? null,
      primaryGeo: p.primaryGeo ?? "GLOBAL",
      notes: p.notes ?? null,
      active: p.active ?? true,
      createdAt: p.createdAt ?? null,
      updatedAt: p.updatedAt ?? null,
    }));

    return NextResponse.json(
      {
        ok: true,
        count: items.length,
        items,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PLACEMENTS GET ERROR:", err);

    const message = err?.message || "Internal Server Error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status:
          message === "Not authenticated"
            ? 401
            : message?.includes("Publisher profile not found")
            ? 403
            : 500,
      }
    );
  }
}

/* --------------------------------------------
   POST /api/publisher/placements
   -------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher(); // ALWAYS profile._id

    const body = await req.json().catch(() => ({}));

    const {
      name,
      appName,
      platform = "web",
      url,
      primaryGeo = "GLOBAL",
      notes,
    } = body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { ok: false, error: "Placement name is required" },
        { status: 400 }
      );
    }

    const placement = await Placement.create({
      publisher: new mongoose.Types.ObjectId(publisherId),
      name: name.trim(),
      appName: appName?.trim() || undefined,
      platform,
      url: url?.trim() || undefined,
      primaryGeo: primaryGeo?.trim() || "GLOBAL",
      notes: notes?.trim() || undefined,
      active: true,
    });

    return NextResponse.json(
      {
        ok: true,
        id: placement._id.toString(),
        placement: {
          id: placement._id.toString(),
          name: placement.name,
          appName: placement.appName ?? null,
          platform: placement.platform,
          url: placement.url ?? null,
          primaryGeo: placement.primaryGeo ?? "GLOBAL",
          notes: placement.notes ?? null,
          active: placement.active ?? true,
          createdAt: placement.createdAt ?? null,
          updatedAt: placement.updatedAt ?? null,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("PLACEMENTS POST ERROR:", err);

    const message = err?.message || "Internal Server Error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status:
          message === "Not authenticated"
            ? 401
            : message?.includes("Publisher profile not found")
            ? 403
            : 500,
      }
    );
  }
}
