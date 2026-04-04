// app/api/admin/advertisers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { AdvertiserProfile } from "@/server/db/models/AdvertiserProfile";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 200);
    const skip = parseInt(url.searchParams.get("skip") ?? "0");

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const [advertisers, total] = await Promise.all([
      AdvertiserProfile.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "name email createdAt")
        .lean(),
      AdvertiserProfile.countDocuments(filter),
    ]);

    return NextResponse.json({
      ok: true,
      total,
      advertisers: advertisers.map((a: any) => ({
        id: a._id.toString(),
        companyName: a.companyName,
        contactEmail: a.contactEmail ?? null,
        websiteUrl: a.websiteUrl ?? null,
        status: a.status,
        apiKeySuffix: a.apiKeySuffix ?? null,
        createdAt: a.createdAt,
        user: a.user
          ? {
              id: a.user._id?.toString() ?? null,
              name: a.user.name ?? null,
              email: a.user.email ?? null,
              createdAt: a.user.createdAt,
            }
          : null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
