// app/api/publisher/payouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requirePublisher } from "@/server/auth/publisher";
import { Wallet } from "@/server/db/models/Wallet";
import { WalletTransaction } from "@/server/db/models/WalletTransaction";
import { PayoutRequest } from "@/server/db/models/PayoutRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Minimum payout: $25 (will be read from SystemSettings once that model is wired)
const MIN_PAYOUT_CENTS = 2500;

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();
    const publisherObjectId = new mongoose.Types.ObjectId(publisherId);

    const wallet = await Wallet.findOne({
      ownerRef: publisherObjectId,
      ownerType: "publisher",
    }).lean();

    const walletId = wallet?._id;

    const [payouts, txs] = await Promise.all([
      PayoutRequest.find({ publisher: publisherObjectId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      walletId
        ? WalletTransaction.find({ wallet: walletId })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean()
        : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        ok: true,
        wallet: wallet
          ? {
              balanceCents: wallet.balance,
              balanceUsd: wallet.balance / 100,
              minPayoutUsd: MIN_PAYOUT_CENTS / 100,
            }
          : { balanceCents: 0, balanceUsd: 0, minPayoutUsd: MIN_PAYOUT_CENTS / 100 },
        payouts: payouts.map((p: any) => ({
          id: p._id.toString(),
          amountCents: p.amountCents,
          amountUsd: (p.amountCents ?? 0) / 100,
          method: p.method,
          destination: p.destination,
          status: p.status,
          createdAt: p.createdAt,
          processedAt: p.processedAt ?? null,
        })),
        transactions: txs.map((t: any) => ({
          id: t._id.toString(),
          type: t.type,
          amountCents: t.amount,
          amountUsd: t.amount / 100,
          reference: t.reference ?? null,
          createdAt: t.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("PAYOUTS GET ERROR:", err);
    const message = err?.message || "Internal Server Error";
    const status =
      message === "Not authenticated" ? 401
      : message.includes("Publisher profile not found") ? 403
      : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();
    const publisherObjectId = new mongoose.Types.ObjectId(publisherId);

    const body = await req.json().catch(() => ({}));
    const { amountUsd, method, destination } = body || {};

    const amountCents = Math.round(Number(amountUsd) * 100);
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ ok: false, error: "Invalid payout amount" }, { status: 400 });
    }

    if (amountCents < MIN_PAYOUT_CENTS) {
      return NextResponse.json(
        {
          ok: false,
          error: `Minimum payout is $${MIN_PAYOUT_CENTS / 100}`,
        },
        { status: 400 }
      );
    }

    if (!method || typeof method !== "string") {
      return NextResponse.json({ ok: false, error: "Payout method is required" }, { status: 400 });
    }

    const wallet = await Wallet.findOne({
      ownerRef: publisherObjectId,
      ownerType: "publisher",
    });

    if (!wallet || wallet.balance < amountCents) {
      return NextResponse.json({ ok: false, error: "Insufficient balance" }, { status: 400 });
    }

    const payout = await PayoutRequest.create({
      publisher: publisherObjectId,
      amountCents,
      method,
      destination: destination?.trim() || undefined,
      status: "pending",
    });

    // Debit balance
    wallet.balance -= amountCents;
    await wallet.save();

    await WalletTransaction.create({
      wallet: wallet._id,
      type: "payout_pending",
      amount: -amountCents,
      reference: payout._id.toString(),
    });

    return NextResponse.json(
      { ok: true, payoutId: payout._id.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("PAYOUTS POST ERROR:", err);
    const message = err?.message || "Internal Server Error";
    const status =
      message === "Not authenticated" ? 401
      : message.includes("Publisher profile not found") ? 403
      : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
