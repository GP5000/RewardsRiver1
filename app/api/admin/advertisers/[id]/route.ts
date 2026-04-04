// app/api/admin/advertisers/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { AdvertiserProfile } from "@/server/db/models/AdvertiserProfile";
import { Campaign } from "@/server/db/models/Campaign";
import { Wallet } from "@/server/db/models/Wallet";
import { AuditLog } from "@/server/db/models/AuditLog";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    await requireAdmin();

    const advertiser = await AdvertiserProfile.findById(params.id)
      .populate("user", "name email createdAt")
      .lean();

    if (!advertiser) {
      return NextResponse.json({ ok: false, error: "Advertiser not found" }, { status: 404 });
    }

    const advertiserObjectId = new mongoose.Types.ObjectId(params.id);

    const [campaigns, wallet] = await Promise.all([
      Campaign.find({ advertiser: advertiserObjectId })
        .select("name status payoutPerConversionCents totalBudgetCents spentTotalCents statsConversions createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      Wallet.findOne({ ownerRef: advertiserObjectId, ownerType: "advertiser" }).lean(),
    ]);

    const a = advertiser as any;
    return NextResponse.json({
      ok: true,
      advertiser: {
        id: a._id.toString(),
        companyName: a.companyName,
        contactEmail: a.contactEmail ?? null,
        websiteUrl: a.websiteUrl ?? null,
        postbackUrl: a.postbackUrl ?? null,
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
        wallet: {
          balanceCents: wallet?.balance ?? 0,
          balanceUsd: (wallet?.balance ?? 0) / 100,
        },
        campaigns: (campaigns as any[]).map((c) => ({
          id: c._id.toString(),
          name: c.name,
          status: c.status,
          payoutPerConversionUsd: c.payoutPerConversionCents / 100,
          totalBudgetUsd: c.totalBudgetCents ? c.totalBudgetCents / 100 : null,
          spentTotalUsd: c.spentTotalCents / 100,
          statsConversions: c.statsConversions,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const { userId } = await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const { action } = body;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined;
    const actorId = new mongoose.Types.ObjectId(userId);

    const advertiser = await AdvertiserProfile.findById(params.id);
    if (!advertiser) {
      return NextResponse.json({ ok: false, error: "Advertiser not found" }, { status: 404 });
    }

    if (action === "approve") {
      if (advertiser.status !== "pending") {
        return NextResponse.json(
          { ok: false, error: "Only pending advertisers can be approved" },
          { status: 400 }
        );
      }
      const before = { status: advertiser.status };
      advertiser.status = "active";
      await advertiser.save();
      await AuditLog.create({
        action: "advertiser.approved",
        actorId,
        actorRole: "admin",
        targetId: advertiser._id,
        targetModel: "AdvertiserProfile",
        before,
        after: { status: "active" },
        ip,
      });
      return NextResponse.json({ ok: true, status: "active" });
    }

    if (action === "suspend") {
      if (advertiser.status === "suspended") {
        return NextResponse.json({ ok: true, status: "suspended" }); // idempotent
      }
      const before = { status: advertiser.status };
      advertiser.status = "suspended";
      await advertiser.save();
      await AuditLog.create({
        action: "advertiser.suspended",
        actorId,
        actorRole: "admin",
        targetId: advertiser._id,
        targetModel: "AdvertiserProfile",
        before,
        after: { status: "suspended" },
        ip,
      });
      return NextResponse.json({ ok: true, status: "suspended" });
    }

    if (action === "reinstate") {
      if (advertiser.status !== "suspended") {
        return NextResponse.json(
          { ok: false, error: "Only suspended advertisers can be reinstated" },
          { status: 400 }
        );
      }
      const before = { status: advertiser.status };
      advertiser.status = "active";
      await advertiser.save();
      await AuditLog.create({
        action: "advertiser.reinstated",
        actorId,
        actorRole: "admin",
        targetId: advertiser._id,
        targetModel: "AdvertiserProfile",
        before,
        after: { status: "active" },
        ip,
      });
      return NextResponse.json({ ok: true, status: "active" });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
