// app/api/wall/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Placement } from "@/server/db/models/Placement";
import { Offer } from "@/server/db/models/Offer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const placementId = searchParams.get("placement_id");
    const subId =
      searchParams.get("sub_id") ?? searchParams.get("user_id") ?? "";
    const device = searchParams.get("device") ?? "desktop";
    const platform = searchParams.get("platform") ?? "web";

    const headerGeo =
      req.headers.get("x-vercel-ip-country") ||
      req.headers.get("cf-ipcountry") ||
      req.headers.get("x-geo-country");

    const geo = headerGeo?.toUpperCase() || "GLOBAL";

    if (!placementId || !mongoose.isValidObjectId(placementId)) {
      return NextResponse.json(
        { ok: false, error: "Valid placement_id is required" },
        { status: 400 }
      );
    }

    const placement = await Placement.findById(placementId)
      .select("_id name publisher active")
      .lean();

    if (!placement || placement.active === false) {
      return NextResponse.json(
        { ok: false, error: "Placement not found or inactive" },
        { status: 404 }
      );
    }

    const publisherId = placement.publisher.toString();

    const match: any = {
      status: "active",
      $and: [
        {
          $or: [
            { placementIds: { $exists: false } },
            { placementIds: { $size: 0 } },
            { placementIds: new mongoose.Types.ObjectId(placementId) },
          ],
        },
        {
          $or: [
            { geoAllow: { $exists: false } },
            { geoAllow: { $size: 0 } },
            { geoAllow: geo },
            { geoAllow: "GLOBAL" },
          ],
        },
        {
          $or: [
            { geoDeny: { $exists: false } },
            { geoDeny: { $size: 0 } },
            { geoDeny: { $ne: geo } },
          ],
        },
        {
          $or: [
            { deviceTarget: { $exists: false } },
            { deviceTarget: "all" },
            { deviceTarget: device },
          ],
        },
        {
          $or: [
            { platforms: { $exists: false } },
            { platforms: { $size: 0 } },
            { platforms: platform },
          ],
        },
      ],
    };

    const offersRaw = await Offer.find(match)
      .sort({ statsEpcUsd: -1, payoutUsd: -1 })
      .limit(50)
      .lean();

    const buildTrackingUrl = (offerId: string, externalUrl: string): string => {
      const params = new URLSearchParams({
        offer_id: offerId,
        publisher_id: publisherId,
        placement_id: placementId,
        subid: subId || "",
        redirect: externalUrl,
      });

      return `/api/click?${params.toString()}`;
    };

   const offers = offersRaw.map((o: any) => ({
  id: o._id.toString(),
  title: o.title ?? o.name ?? "Untitled Offer",
  payoutUsd: o.payoutUsd,
  estMinutes: o.estimatedMinutes ?? null,
  network: o.network,
  category: o.category ?? null,
  description: o.description ?? null,
  badge: o.badge ?? null,
  trackingUrl: buildTrackingUrl(
    o._id.toString(),
    o.redirectUrl
  ),
  imageUrl: o.imageUrl ?? null,
}));


    return NextResponse.json(
      {
        ok: true,
        placement: {
          id: placement._id.toString(),
          name: placement.name,
          geo,
          device,
          platform,
        },
        offers,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("WALL API ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal Server Error",
        message: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
