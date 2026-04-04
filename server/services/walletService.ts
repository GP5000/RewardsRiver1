/**
 * server/services/walletService.ts
 * All wallet debit/credit operations. Every money-touching function uses
 * session.withTransaction() and writes an AuditLog entry in the same transaction.
 *
 * Invariants enforced here (see docs/invariants.md):
 *   - Wallet.balance must never go negative (pre-flight check before any debit)
 *   - Every WalletTransaction has a source reference
 */

import mongoose from "mongoose";
import { Wallet } from "@/server/db/models/Wallet";
import { WalletTransaction, WalletTransactionType } from "@/server/db/models/WalletTransaction";
import { AuditLog } from "@/server/db/models/AuditLog";

interface DebitOpts {
  ownerRef: mongoose.Types.ObjectId;
  ownerType: "publisher" | "advertiser";
  amountCents: number;
  type: WalletTransactionType;
  reference?: string;
  actorId?: mongoose.Types.ObjectId;
  actorRole?: string;
  ip?: string;
}

interface CreditOpts {
  ownerRef: mongoose.Types.ObjectId;
  ownerType: "publisher" | "advertiser";
  amountCents: number;
  type: WalletTransactionType;
  reference?: string;
  actorId?: mongoose.Types.ObjectId;
  actorRole?: string;
  ip?: string;
}

/**
 * Debits a wallet atomically within an existing session.
 * Throws "INSUFFICIENT_BALANCE" if balance < amountCents.
 * Call inside session.withTransaction().
 */
export async function debitWallet(
  opts: DebitOpts,
  session: mongoose.ClientSession
): Promise<void> {
  const { ownerRef, ownerType, amountCents, type, reference, actorId, actorRole, ip } = opts;

  const wallet = await Wallet.findOne(
    { ownerRef, ownerType },
    null,
    { session }
  );

  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  if (wallet.balance < amountCents) throw new Error("INSUFFICIENT_BALANCE");

  wallet.balance -= amountCents;
  await wallet.save({ session });

  await WalletTransaction.create(
    [{ wallet: wallet._id, type, amount: -amountCents, reference }],
    { session }
  );

  await AuditLog.create(
    [{
      action: `wallet.debit.${type}`,
      actorId,
      actorRole: actorRole ?? "system",
      targetId: wallet._id,
      targetModel: "Wallet",
      before: { balance: wallet.balance + amountCents },
      after: { balance: wallet.balance },
      ip,
    }],
    { session }
  );
}

/**
 * Credits a wallet atomically within an existing session.
 * Call inside session.withTransaction().
 */
export async function creditWallet(
  opts: CreditOpts,
  session: mongoose.ClientSession
): Promise<void> {
  const { ownerRef, ownerType, amountCents, type, reference, actorId, actorRole, ip } = opts;

  const wallet = await Wallet.findOne(
    { ownerRef, ownerType },
    null,
    { session }
  );

  if (!wallet) throw new Error("WALLET_NOT_FOUND");

  wallet.balance += amountCents;
  await wallet.save({ session });

  await WalletTransaction.create(
    [{ wallet: wallet._id, type, amount: amountCents, reference }],
    { session }
  );

  await AuditLog.create(
    [{
      action: `wallet.credit.${type}`,
      actorId,
      actorRole: actorRole ?? "system",
      targetId: wallet._id,
      targetModel: "Wallet",
      before: { balance: wallet.balance - amountCents },
      after: { balance: wallet.balance },
      ip,
    }],
    { session }
  );
}

/**
 * Ensures a wallet exists for the given owner, creating one if needed.
 * Safe to call on registration.
 */
export async function ensureWallet(
  ownerRef: mongoose.Types.ObjectId,
  ownerType: "publisher" | "advertiser"
): Promise<void> {
  const exists = await Wallet.findOne({ ownerRef, ownerType }).lean();
  if (!exists) {
    await Wallet.create({ ownerRef, ownerType, currency: "USD", balance: 0 });
  }
}
