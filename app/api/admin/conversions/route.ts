// app/api/admin/conversions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { OfferConversion } from "@/server/db/models/OfferConversion";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 200);
    const skip = parseInt(url.searchParams.get("skip") ?? "0");

    const filter: Record<string, any> = {};
    if (status !== "all") filter.conversionStatus = status;

    const [conversions, total] = await Promise.all([
      OfferConversion.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("offer", "name payoutUsd")
        .populate("publisher", "name")
        .lean(),
      OfferConversion.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      total,
      conversions: (conversions as any[]).map((c) => ({
        id: c._id.toString(),
        conversionStatus: c.conversionStatus,
        clickId: c.clickId ?? null,
        subId: c.subId ?? null,
        payoutUsd: c.payoutUsd ?? 0,
        advertiserPayoutUsd: c.advertiserPayoutUsd ?? 0,
        offer: c.offer
          ? { id: c.offer._id?.toString(), name: c.offer.name ?? "Unknown" }
          : null,
        publisher: c.publisher
          ? { id: c.publisher._id?.toString(), name: c.publisher.name ?? "Unknown" }
          : null,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
