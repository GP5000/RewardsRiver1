// app/api/advertiser/billing/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { requireAdvertiser } from "@/server/auth/advertiser";
import { Wallet } from "@/server/db/models/Wallet";
import { WalletTransaction } from "@/server/db/models/WalletTransaction";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { advertiserId } = await requireAdvertiser();
    const advertiserObjectId = new mongoose.Types.ObjectId(advertiserId);

    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);
    const skip = parseInt(url.searchParams.get("skip") ?? "0");

    const [wallet, transactions, total] = await Promise.all([
      Wallet.findOne({ ownerRef: advertiserObjectId, ownerType: "advertiser" }).lean(),
      WalletTransaction.find({ wallet: { $exists: true } })
        .where("wallet")
        .populate({
          path: "wallet",
          match: { ownerRef: advertiserObjectId, ownerType: "advertiser" },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WalletTransaction.countDocuments({}),
    ]);

    // A simpler approach: find wallet first, then query transactions by wallet id
    const walletDoc = wallet as any;
    const txs = walletDoc?._id
      ? await WalletTransaction.find({ wallet: walletDoc._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean()
      : [];

    const txTotal = walletDoc?._id
      ? await WalletTransaction.countDocuments({ wallet: walletDoc._id })
      : 0;

    return NextResponse.json({
      ok: true,
      wallet: {
        balanceCents: walletDoc?.balance ?? 0,
        balanceUsd: (walletDoc?.balance ?? 0) / 100,
      },
      total: txTotal,
      transactions: txs.map((t: any) => ({
        id: t._id.toString(),
        type: t.type,
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
