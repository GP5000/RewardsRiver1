// app/api/admin/conversions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { requireAdmin } from "@/server/auth/admin";
import { approveConversion, rejectConversion } from "@/server/services/conversionService";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();
    const { userId } = await requireAdmin();

    const { action, reason } = await req.json();

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { ok: false, error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    const actorId = new mongoose.Types.ObjectId(userId);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? undefined;

    if (action === "approve") {
      await approveConversion(id, actorId, ip);
    } else {
      await rejectConversion(id, actorId, reason, ip);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    const status =
      err?.message === "CONVERSION_NOT_FOUND" ? 404
      : err?.message?.startsWith("INVALID_TRANSITION") ? 409
      : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
