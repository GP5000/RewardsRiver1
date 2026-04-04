// app/api/advertiser/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdvertiser } from "@/server/auth/advertiser";
import { AdvertiserProfile } from "@/server/db/models/AdvertiserProfile";
import { regenerateApiKey } from "@/server/services/advertiserService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { advertiserId } = await requireAdvertiser();

    const profile = await AdvertiserProfile.findById(advertiserId).lean();
    if (!profile) {
      return NextResponse.json({ ok: false, error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      settings: {
        companyName: profile.companyName,
        contactEmail: profile.contactEmail ?? null,
        websiteUrl: profile.websiteUrl ?? null,
        postbackUrl: profile.postbackUrl ?? null,
        status: profile.status,
        apiKeySuffix: profile.apiKeySuffix ?? null,
      },
    });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { advertiserId } = await requireAdvertiser();

    const body = await req.json().catch(() => ({}));
    const { companyName, contactEmail, websiteUrl, postbackUrl, regenApiKey } = body;

    if (regenApiKey) {
      const newKey = await regenerateApiKey(advertiserId);
      return NextResponse.json({ ok: true, apiKey: newKey });
    }

    const updates: Record<string, any> = {};
    if (companyName) updates.companyName = companyName.trim();
    if (contactEmail !== undefined) updates.contactEmail = contactEmail?.trim() || null;
    if (websiteUrl !== undefined) updates.websiteUrl = websiteUrl?.trim() || null;
    if (postbackUrl !== undefined) updates.postbackUrl = postbackUrl?.trim() || null;

    await AdvertiserProfile.findByIdAndUpdate(advertiserId, updates);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
