// app/api/publisher/postback-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requirePublisher } from "@/server/auth/publisher";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
} as const;

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();

    const publisher = await PublisherProfile.findById(publisherId).lean();
    if (!publisher) {
      return NextResponse.json(
        { ok: false, error: "Publisher not found" },
        { status: 404, headers: NO_STORE }
      );
    }

    const postbackUrl: string | undefined = (publisher as any).postbackUrl;
    if (!postbackUrl) {
      return NextResponse.json(
        { ok: false, error: "No postback URL configured" },
        { status: 400, headers: NO_STORE }
      );
    }

    const url = new URL(postbackUrl);

    url.searchParams.set("user_id", "test-user-123");
    url.searchParams.set("offer_id", "test-offer-456");
    url.searchParams.set("payout", "1.23");
    url.searchParams.set("currency", "USD");
    url.searchParams.set("status", "approved");
    url.searchParams.set("transaction_id", "test-tx-789");
    url.searchParams.set("test", "1");

    const res = await fetch(url.toString(), { method: "GET" });
    const text = await res.text();
    const snippet = text.slice(0, 300);

    return NextResponse.json(
      {
        ok: true,
        status: res.status,
        statusText: res.statusText,
        bodySnippet: snippet,
        url: url.toString(),
      },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    console.error("[postback-test] ERROR", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Failed to test postback",
      },
      { status: 500, headers: NO_STORE }
    );
  }
}
