// app/api/advertiser/campaigns/[id]/test-postback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdvertiser } from "@/server/auth/advertiser";
import { Campaign } from "@/server/db/models/Campaign";
import { validatePublicUrl } from "@/lib/validateUrl";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const { advertiserId } = await requireAdvertiser();

    const campaign = await Campaign.findOne({
      _id: id,
      advertiser: advertiserId,
    });

    if (!campaign) {
      return NextResponse.json({ ok: false, error: "Campaign not found" }, { status: 404 });
    }

    if (!campaign.postbackUrl) {
      return NextResponse.json({ ok: false, error: "No postback URL configured" }, { status: 400 });
    }

    // SSRF check before fetching
    const validatedUrl = await validatePublicUrl(campaign.postbackUrl);

    const testUrl = new URL(validatedUrl);
    testUrl.searchParams.set("click_id", "test-" + crypto.randomUUID());
    testUrl.searchParams.set("status", "1");
    testUrl.searchParams.set("test", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let status: number;
    try {
      const resp = await fetch(testUrl.toString(), {
        method: "GET",
        signal: controller.signal,
        headers: { "User-Agent": "RewardsRiver/1.0 postback-tester" },
      });
      status = resp.status;
    } finally {
      clearTimeout(timeout);
    }

    if (status >= 200 && status < 300) {
      return NextResponse.json({
        ok: true,
        message: `Postback returned HTTP ${status}`,
      });
    }

    return NextResponse.json({
      ok: false,
      error: `Postback returned HTTP ${status}`,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ ok: false, error: "Postback timed out (5s)" }, { status: 422 });
    }
    if (err?.message?.includes("ValidationError") || err?.message?.includes("private")) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 422 });
    }
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
