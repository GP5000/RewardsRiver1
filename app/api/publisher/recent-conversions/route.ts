// app/api/publisher/recent-conversions/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { ConversionLog } from "@/server/db/models/ConversionLog";
import { requirePublisher } from "@/server/auth/publisher";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  let publisherId = searchParams.get("publisherId");
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam), 100) : 25;

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

  const conversions = await ConversionLog.find({
    publisher: publisherObjectId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const items = conversions.map((conv: any) => ({
    id: conv._id.toString(),
    clickId: conv.click?.toString?.() ?? null,
    offerId: conv.offer?.toString?.() ?? null,
    advertiserPayoutUsd: conv.advertiserPayoutUsd,
    publisherPayoutUsd: conv.publisherPayoutUsd,
    status: conv.status,
    createdAt: conv.createdAt,
  }));

  return NextResponse.json({ items });
}
