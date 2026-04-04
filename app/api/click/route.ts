// app/api/click/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Offer } from "@/server/db/models/Offer";
import { Placement } from "@/server/db/models/Placement";
import { OfferClick } from "@/server/db/models/OfferClick";
import { checkRateLimit } from "@/lib/rateLimit";
import { lookupCountry } from "@/lib/geoip";
import { isIpBlocked } from "@/server/services/fraudService";
import { clickLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function getClientIp(req: NextRequest): string | null {
  return (
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirect = searchParams.get("redirect") || "/";

  try {
    await connectDB();

    const offerId = searchParams.get("offer_id");
    const publisherId = searchParams.get("publisher_id");
    const placementId = searchParams.get("placement_id");
    const subId = searchParams.get("subid") ?? undefined;
    // Device fingerprint from widget JS (hash of userAgent + screen resolution)
    const fp = searchParams.get("fp") ?? undefined;

    if (
      !offerId ||
      !publisherId ||
      !placementId ||
      !mongoose.isValidObjectId(offerId) ||
      !mongoose.isValidObjectId(placementId)
    ) {
      return NextResponse.redirect(redirect, { status: 302 });
    }

    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") || null;

    // Check if IP is blocked
    if (ip) {
      const blocked = await isIpBlocked(ip);
      if (blocked) {
        clickLogger.warn({ ip, offerId, action: "blocked_ip" }, "Click rejected: blocked IP");
        return NextResponse.redirect(redirect, { status: 302 });
      }
    }

    // Rate limiting: 30 clicks/min per IP (global default)
    if (ip) {
      const allowed = await checkRateLimit(`click:ip:${ip}`, 30, 60);
      if (!allowed) {
        clickLogger.warn({ ip, offerId, action: "rate_limited" }, "Click rejected: rate limit");
        return new NextResponse("Too Many Requests", { status: 429 });
      }
    }

    const [offer, placement] = await Promise.all([
      Offer.findById(offerId).select("_id status statsClicks").lean(),
      Placement.findById(placementId).select("_id publisher rateLimit").lean(),
    ]);

    if (!offer || offer.status !== "active" || !placement) {
      return NextResponse.redirect(redirect, { status: 302 });
    }

    // Per-placement rate limit override
    if (ip && (placement.rateLimit ?? 0) > 0) {
      const placementAllowed = await checkRateLimit(
        `click:placement:${placementId}:ip:${ip}`,
        placement.rateLimit!,
        60
      );
      if (!placementAllowed) {
        clickLogger.warn(
          { ip, placementId, action: "placement_rate_limited" },
          "Click rejected: placement rate limit"
        );
        return new NextResponse("Too Many Requests", { status: 429 });
      }
    }

    // Deduplication: same subId + offer within last 5 minutes
    if (subId) {
      const since5min = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await OfferClick.findOne({
        subId,
        offer: new mongoose.Types.ObjectId(offerId),
        createdAt: { $gte: since5min },
      })
        .select("_id")
        .lean();

      if (existing) {
        clickLogger.info(
          { subId, offerId, action: "deduped" },
          "Click deduped — redirecting without write"
        );
        return NextResponse.redirect(redirect, { status: 302 });
      }
    }

    // Generate unique click ID for postback matching
    const clickId = crypto.randomUUID();
    const country = lookupCountry(ip);
    const device = req.headers.get("x-device") || undefined;
    const platform = req.headers.get("x-platform") || undefined;

    await OfferClick.create({
      offer: new mongoose.Types.ObjectId(offerId),
      placement: placement._id,
      publisher: placement.publisher,
      clickId,
      subId,
      device,
      platform,
      ip,
      userAgent,
      country,
      deviceFingerprint: fp ?? null,
    });

    await Offer.findByIdAndUpdate(offer._id, { $inc: { statsClicks: 1 } }).exec();

    clickLogger.info(
      { clickId, offerId, placementId, ip, country, subId },
      "Click recorded"
    );

    // Inject clickId into the redirect URL — replace common network macros
    // Networks store their postback URL as: https://network.com/offer?s1={click_id}
    // We replace the macro so the network receives our UUID and echoes it back in the postback.
    const finalRedirect = redirect
      .replace(/\{click_id\}/gi, clickId)
      .replace(/\[click_id\]/gi, clickId)
      .replace(/\{clickid\}/gi, clickId)
      .replace(/\[clickid\]/gi, clickId)
      .replace(/%%CLICK_ID%%/g, clickId)
      .replace(/\{transaction_id\}/gi, clickId)
      .replace(/\[transaction_id\]/gi, clickId);

    // Set rr_cid cookie (30 days) so the wall page can retrieve it for postback matching
    const response = NextResponse.redirect(finalRedirect, { status: 302 });
    response.cookies.set("rr_cid", clickId, {
      maxAge: 30 * 24 * 60 * 60,
      sameSite: "none",
      secure: true,
      httpOnly: true,
      path: "/",
    });
    return response;
  } catch (err: any) {
    clickLogger.error({ err: err?.message }, "Click API error");
    return NextResponse.redirect(redirect, { status: 302 });
  }
}
