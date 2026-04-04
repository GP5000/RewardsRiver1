// app/api/publisher/recent-clicks/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { ClickLog } from "@/server/db/models/ClickLog";
import { requirePublisher } from "@/server/auth/publisher";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  let publisherId = searchParams.get("publisherId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam), 100) : 25;

  // If no explicit publisherId is provided, use the logged-in publisher
  if (!publisherId) {
    const ctx = await requirePublisher();
    publisherId = ctx.publisherId;
  }

  if (!publisherId || !mongoose.isValidObjectId(publisherId)) {
    return NextResponse.json(
      { error: "Invalid or missing publisherId" },
      { status: 400 }
    );
  }

  const publisherObjectId = new mongoose.Types.ObjectId(publisherId);

  const clicks = await ClickLog.find({ publisher: publisherObjectId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const items = clicks.map((c: any) => ({
    id: c._id.toString(),
    clickId: c.clickId,
    offerId: c.offer?.toString?.() ?? null,
    subId: c.subId ?? null,
    createdAt: c.createdAt,
    ip: c.ip ?? null,
    userAgent: c.userAgent ?? null,
  }));

  return NextResponse.json({ items });
}
