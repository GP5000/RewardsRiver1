// app/api/admin/fraud/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { getFraudSignals, blockIp } from "@/server/services/fraudService";
import { BlockedIp } from "@/server/db/models/BlockedIp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    await requireAdmin();

    const signals = await getFraudSignals();

    // Also return currently blocked IPs
    const blockedIps = await BlockedIp.find({
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      ok: true,
      signals,
      blockedIps: blockedIps.map((b: any) => ({
        id: b._id.toString(),
        ip: b.ip,
        reason: b.reason ?? null,
        expiresAt: b.expiresAt ?? null,
        createdAt: b.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId } = await requireAdmin();

    const body = await req.json().catch(() => ({}));
    const { action, ip, reason, expiresAt } = body;

    if (action === "block_ip") {
      if (!ip || typeof ip !== "string") {
        return NextResponse.json({ ok: false, error: "ip is required" }, { status: 400 });
      }
      await blockIp(ip, userId, reason ?? "Admin block", expiresAt ? new Date(expiresAt) : null);
      return NextResponse.json({ ok: true });
    }

    if (action === "unblock_ip") {
      if (!ip || typeof ip !== "string") {
        return NextResponse.json({ ok: false, error: "ip is required" }, { status: 400 });
      }
      await BlockedIp.deleteOne({ ip });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}
