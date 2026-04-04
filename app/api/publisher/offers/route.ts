// app/api/publisher/offers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requirePublisher } from "@/server/auth/publisher";
import { Offer } from "@/server/db/models/Offer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // just ensures the user is a publisher
    await requirePublisher();

    const { searchParams } = new URL(req.url);
    const geo = searchParams.get("geo");
    const platform = searchParams.get("platform");
    const category = searchParams.get("category");

    const query: any = { active: true };

    if (geo && geo !== "GLOBAL") {
      query.allowedGeos = geo;
    }

    if (platform) {
      query.platforms = platform;
    }

    if (category) {
      query.category = category;
    }

    const offers = await Offer.find(query).limit(100).lean();

    return NextResponse.json(
      {
        ok: true,
        items: offers.map((o: any) => ({
          id: o._id.toString(),
          name: o.name,
          payoutUsd: o.payoutUsd,
          epc: o.epc ?? null,
          network: o.network ?? null,
          geoTargeting: o.allowedGeos ?? [],
          category: o.category ?? null,
        })),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("OFFERS GET ERROR:", err);

    const message = err?.message || "Internal Server Error";
    const status =
      message === "Not authenticated"
        ? 401
        : message.includes("Publisher profile not found")
        ? 403
        : 500;

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status }
    );
  }
}
