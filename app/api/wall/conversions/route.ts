// app/api/wall/conversions/route.ts
// Public endpoint — returns a user's own conversions for display in the wall iframe.
// Identified by subId (publisher's user identifier) + placementId.
// No auth — subId is end-user opaque. Never returns PII.
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { OfferConversion } from "@/server/db/models/OfferConversion";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const url = new URL(req.url);
    const subId = url.searchParams.get("sub_id");
    const placementId = url.searchParams.get("placement_id");

    if (!subId) {
      return NextResponse.json({ ok: true, conversions: [] });
    }

    const filter: Record<string, any> = { subId };
    if (placementId) filter.placement = placementId;

    const conversions = await OfferConversion.find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("offer", "name imageUrl category")
      .lean();

    return NextResponse.json({
      ok: true,
      conversions: (conversions as any[]).map((c) => ({
        id: c._id.toString(),
        conversionStatus: c.conversionStatus,
        payoutUsd: c.payoutUsd ?? 0,
        rejectionReason: c.rejectionReason ?? null,
        offer: c.offer
          ? {
              id: c.offer._id?.toString(),
              name: c.offer.name ?? "Offer",
              imageUrl: c.offer.imageUrl ?? null,
              category: c.offer.category ?? null,
            }
          : null,
        createdAt: c.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
