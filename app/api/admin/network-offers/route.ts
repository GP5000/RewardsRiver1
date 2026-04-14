// app/api/admin/network-offers/route.ts
// Fetches available offers from a network's API (server-side, keeps credentials secret).
// GET  ?network=adtowall            → returns normalized offer list
// POST ?network=adtowall            → upserts selected offers into MongoDB

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { connectDB } from "@/server/db/connect";
import { Offer } from "@/server/db/models/Offer";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user: any = session?.user;
  if (!session || !(user?.role === "admin" || user?.isAdmin === true)) return null;
  return session;
}

/* ─── AdToWall fetcher ─── */

function buildAdToWallUrl(affiliateId: string, o: any): string {
  if (o.tracking_url ?? o.click_url ?? o.url) {
    const raw: string = o.tracking_url ?? o.click_url ?? o.url;
    return raw
      .replace(/\{uid\}/gi, "{click_id}")
      .replace(/\{user_id\}/gi, "{click_id}")
      .replace(/\{subid\}/gi, "{click_id}")
      .replace(/\{sub_id\}/gi, "{click_id}")
      .replace(/\[uid\]/gi, "{click_id}")
      .replace(/\[user_id\]/gi, "{click_id}");
  }
  const offerId = o.id ?? o.offer_id;
  return `https://adtowall.com/click?affiliate_id=${affiliateId}&offer_id=${offerId}&uid={click_id}`;
}

async function fetchAdToWall(): Promise<any[]> {
  const affiliateId = process.env.ADTOWALL_AFFILIATE_ID;
  const apiKey = process.env.ADTOWALL_API_KEY;
  if (!affiliateId || !apiKey) throw new Error("ADTOWALL_AFFILIATE_ID and ADTOWALL_API_KEY must be set");

  const url = `https://adtowall.com/api/v1/offers?affiliate_id=${affiliateId}&api_key=${apiKey}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AdToWall API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw: any[] = Array.isArray(data) ? data : (data.offers ?? data.data ?? []);

  return raw.map((o: any) => {
    let deviceTarget: "all" | "desktop" | "mobile" = "all";
    const dev = (o.device ?? o.platform ?? "").toLowerCase();
    if (dev === "mobile" || dev === "android" || dev === "ios") deviceTarget = "mobile";
    else if (dev === "desktop" || dev === "web") deviceTarget = "desktop";

    let geoAllow: string[] = [];
    if (o.countries) {
      geoAllow = typeof o.countries === "string"
        ? o.countries.split(",").map((c: string) => c.trim().toUpperCase()).filter(Boolean)
        : (o.countries as string[]).map((c: string) => c.toUpperCase());
    }

    return {
      externalOfferId: String(o.id ?? o.offer_id),
      name: o.name ?? o.title ?? "Untitled",
      title: o.name ?? o.title ?? "Untitled",
      description: o.description ?? "",
      redirectUrl: buildAdToWallUrl(affiliateId, o),
      payoutUsd: parseFloat(o.payout ?? o.revenue ?? 0),
      category: o.category ?? o.type ?? null,
      imageUrl: o.image_url ?? o.icon ?? o.thumbnail ?? null,
      estimatedMinutes: o.time ?? o.estimated_minutes ?? null,
      geoAllow,
      deviceTarget,
      platforms: deviceTarget === "mobile" ? ["android", "ios"] : ["web"],
      dailyCap: o.daily_cap ?? o.cap ?? null,
    };
  });
}

/* ─── GET — browse available offers from network ─── */

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const network = new URL(req.url).searchParams.get("network");
  if (!network) {
    return NextResponse.json({ ok: false, error: "network param required" }, { status: 400 });
  }

  try {
    let offers: any[] = [];
    if (network === "adtowall") offers = await fetchAdToWall();
    else return NextResponse.json({ ok: false, error: `Unknown network: ${network}` }, { status: 400 });

    // Check which externalOfferIds already exist in DB so UI can mark them
    await connectDB();
    const existing = await Offer.find({
      network,
      externalOfferId: { $in: offers.map((o) => o.externalOfferId) },
    }).select("externalOfferId status").lean();
    const existingMap = Object.fromEntries(
      existing.map((e: any) => [e.externalOfferId, e.status])
    );

    const annotated = offers.map((o) => ({
      ...o,
      alreadyImported: !!existingMap[o.externalOfferId],
      importedStatus: existingMap[o.externalOfferId] ?? null,
    }));

    return NextResponse.json({ ok: true, network, count: annotated.length, offers: annotated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

/* ─── POST — upsert selected offers into DB ─── */

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { network, offers } = await req.json();
  if (!network || !Array.isArray(offers) || offers.length === 0) {
    return NextResponse.json({ ok: false, error: "network and offers[] required" }, { status: 400 });
  }

  await connectDB();

  let inserted = 0, updated = 0, errors = 0;

  for (const o of offers) {
    try {
      const doc = {
        name: o.name,
        title: o.title ?? o.name,
        description: o.description ?? "",
        network,
        externalOfferId: o.externalOfferId,
        redirectUrl: o.redirectUrl,
        payoutUsd: o.payoutUsd,
        advertiserPayoutUsd: o.payoutUsd,
        estimatedMinutes: o.estimatedMinutes ?? null,
        category: o.category ?? null,
        imageUrl: o.imageUrl ?? null,
        geoAllow: o.geoAllow ?? [],
        geoDeny: [],
        deviceTarget: o.deviceTarget ?? "all",
        platforms: o.platforms ?? ["web"],
        dailyCap: o.dailyCap ?? null,
        status: "active",
      };

      const existing = await Offer.findOne({ network, externalOfferId: o.externalOfferId });
      await Offer.findOneAndUpdate(
        { network, externalOfferId: o.externalOfferId },
        { $set: doc },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      existing ? updated++ : inserted++;
    } catch (err: any) {
      console.error(`network-offers import error for ${o.externalOfferId}:`, err.message);
      errors++;
    }
  }

  return NextResponse.json({ ok: true, inserted, updated, errors });
}
