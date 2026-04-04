// app/api/admin/payouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { PayoutRequest } from "@/server/db/models/PayoutRequest";
import { Wallet } from "@/server/db/models/Wallet";
import { WalletTransaction } from "@/server/db/models/WalletTransaction";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "pending";

  const filter: any = {};
  if (status !== "all") {
    filter.status = status;
  }

  const payouts = await PayoutRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const items = payouts.map((p: any) => ({
    id: p._id.toString(),
    publisherId: p.publisher?.toString(),
    amountCents: p.amountCents,
    currency: p.currency || "USD",
    method: p.method,
    destination: p.destination || p.payoutAddress || null,
    status: p.status,
    createdAt: p.createdAt,
    processedAt: p.processedAt || null,
  }));

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  await connectDB();

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { payoutRequestId, action } = body as {
    payoutRequestId?: string;
    action?: "approve" | "reject" | "markPaid";
  };

  if (!payoutRequestId || !mongoose.isValidObjectId(payoutRequestId)) {
    return NextResponse.json(
      { error: "Invalid or missing payoutRequestId" },
      { status: 400 }
    );
  }

  if (!action) {
    return NextResponse.json(
      { error: "Action is required" },
      { status: 400 }
    );
  }

  const payout = await PayoutRequest.findById(payoutRequestId);
  if (!payout) {
    return NextResponse.json(
      { error: "Payout request not found" },
      { status: 404 }
    );
  }

  if (payout.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending payouts can be modified" },
      { status: 400 }
    );
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      if (action === "approve" || action === "markPaid") {
        payout.status = action === "approve" ? "approved" : "paid";
        payout.processedAt = new Date();
        await payout.save({ session });

        // Optionally: mark WalletTransaction as approved/paid later
      } else if (action === "reject") {
        // Refund wallet
        const wallet = await Wallet.findOne({
          ownerType: "publisher",
          ownerRef: payout.publisher,
        }).session(session);

        if (wallet) {
          wallet.balance = (wallet.balance ?? 0) + payout.amountCents;
          await wallet.save({ session });

          await WalletTransaction.create(
            [
              {
                wallet: wallet._id,
                amountCents: payout.amountCents,
                type: "payout_reversal",
                status: "completed",
                meta: {
                  payoutRequestId: payout._id,
                },
              },
            ],
            { session }
          );
        }

        payout.status = "rejected";
        payout.processedAt = new Date();
        await payout.save({ session });
      }
    });

    return NextResponse.json({ ok: true, status: payout.status });
  } finally {
    session.endSession();
  }
}
