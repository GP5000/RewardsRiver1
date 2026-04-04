// app/api/publisher/earnings/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requirePublisher } from "@/server/auth/publisher";
import { Wallet } from "@/server/db/models/Wallet";
import { WalletTransaction } from "@/server/db/models/WalletTransaction";

export const dynamic = "force-dynamic";

const TX_TYPE_LABEL: Record<string, string> = {
  conversion_credit: "Conversion credit",
  referral_bonus: "Referral bonus",
  payout_pending: "Payout requested",
  payout_settled: "Payout settled",
  payout_refund: "Payout refunded",
  deposit: "Deposit",
  ad_spend: "Ad spend",
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();
    const publisherObjectId = new mongoose.Types.ObjectId(publisherId);

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const skip = parseInt(url.searchParams.get("skip") ?? "0");

    const wallet = await Wallet.findOne({
      ownerRef: publisherObjectId,
      ownerType: "publisher",
    }).lean();

    const walletDoc = wallet as any;
    if (!walletDoc?._id) {
      return NextResponse.json({ ok: true, wallet: { balanceCents: 0, balanceUsd: 0 }, total: 0, transactions: [] });
    }

    const [transactions, total] = await Promise.all([
      WalletTransaction.find({ wallet: walletDoc._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments({ wallet: walletDoc._id }),
    ]);

    // Compute running balance (descending, so reverse to get ascending then reverse result)
    // We'll just return raw transactions; client computes running balance
    return NextResponse.json({
      ok: true,
      wallet: {
        balanceCents: walletDoc.balance ?? 0,
        balanceUsd: (walletDoc.balance ?? 0) / 100,
      },
      total,
      transactions: (transactions as any[]).map((t) => ({
        id: t._id.toString(),
        type: t.type,
        typeLabel: TX_TYPE_LABEL[t.type] ?? t.type,
        amountCents: t.amount,
        amountUsd: t.amount / 100,
        description: t.description ?? null,
        createdAt: t.createdAt,
      })),
    });
  } catch (err: any) {
    const status = err?.message === "Not authenticated" ? 401 : 500;
    return NextResponse.json({ ok: false, error: err?.message }, { status });
  }
}
