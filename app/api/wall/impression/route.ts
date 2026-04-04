// app/api/wall/impression/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { ImpressionLog } from "@/server/db/models/ImpressionLog";
import { Placement } from "@/server/db/models/Placement";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function handleImpression(req: NextRequest) {
  await connectDB();

  const url = new URL(req.url);
  const searchParams = url.searchParams;

  let body: any = {};
  if (req.method === "POST") {
    body = (await req.json().catch(() => ({}))) || {};
  }

  const placementId =
    body.placementId ||
    searchParams.get("placementId") ||
    searchParams.get("placement_id");

  const subId =
    body.subId ||
    searchParams.get("sub_id") ||
    searchParams.get("user_id") ||
    undefined;

  if (!placementId || !mongoose.isValidObjectId(placementId)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid placementId" },
      { status: 400 }
    );
  }

  const placement = await Placement.findById(placementId)
    .select("_id publisher")
    .lean();

  if (!placement) {
    return NextResponse.json(
      { ok: false, error: "Placement not found" },
      { status: 404 }
    );
  }

  const ipHeader =
    req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  const ip = ipHeader ? ipHeader.split(",")[0].trim() : null;
  const userAgent = req.headers.get("user-agent") || null;

  await ImpressionLog.create({
    publisher: placement.publisher,
    placement: placement._id,
    subId,
    ip,
    userAgent,
  } as any);

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  return handleImpression(req);
}

export async function POST(req: NextRequest) {
  return handleImpression(req);
}
