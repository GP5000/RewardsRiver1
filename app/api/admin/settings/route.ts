// app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { getSystemSettings, invalidateSettingsCache } from "@/server/db/models/SystemSettings";
import { SystemSettings } from "@/server/db/models/SystemSettings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const settings = await getSystemSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const body = await req.json().catch(() => ({}));

    const allowed = [
      "platformFeePercent",
      "minPayoutCents",
      "fraudClickVelocityLimit",
      "fraudCvrThreshold",
      "fraudIpMismatchThreshold",
      "referralBonusPercent",
      "referralBonusCapCents",
      "referralWindowDays",
      "autoApproveConversions",
    ];

    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, error: "No valid fields to update" }, { status: 400 });
    }

    await SystemSettings.findOneAndUpdate(
      { singleton: true },
      { $set: updates },
      { upsert: true, new: true }
    );

    invalidateSettingsCache();

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
