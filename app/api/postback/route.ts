// app/api/postback/route.ts
// Receives conversion postbacks from ad networks / advertisers.
// All money operations are atomic via session.withTransaction().
// Returns 200 for all non-error cases (networks expect 200 even on unknown click IDs).
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { OfferClick } from "@/server/db/models/OfferClick";
import { OfferConversion } from "@/server/db/models/OfferConversion";
import { Offer } from "@/server/db/models/Offer";
import { Campaign } from "@/server/db/models/Campaign";
import { Wallet } from "@/server/db/models/Wallet";
import { WalletTransaction } from "@/server/db/models/WalletTransaction";
import { AuditLog } from "@/server/db/models/AuditLog";
import { postbackLogger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const GLOBAL_SECRET = process.env.RR_CONVERT_SECRET ?? "dev-secret";

function getClientIp(req: NextRequest): string | null {
  return (
    (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function isToday(date: Date): boolean {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export async function GET(req: NextRequest) {
  return handlePostback(req);
}

export async function POST(req: NextRequest) {
  return handlePostback(req);
}

async function handlePostback(req: NextRequest): Promise<NextResponse> {
  const traceId = crypto.randomUUID();
  const ip = getClientIp(req);

  try {
    await connectDB();

    let params: URLSearchParams;
    if (req.method === "POST") {
      const body = await req.text();
      params = new URLSearchParams(body);
      // Also check URL params
      const urlParams = new URL(req.url).searchParams;
      urlParams.forEach((v, k) => { if (!params.has(k)) params.set(k, v); });
    } else {
      params = new URL(req.url).searchParams;
    }

    const clickId = params.get("click_id") ?? params.get("clickid");
    const amountStr = params.get("amount") ?? params.get("payout");
    const secret = params.get("secret") ?? params.get("token");

    if (!clickId) {
      postbackLogger.warn({ traceId, ip }, "Postback missing click_id");
      return new NextResponse("OK", { status: 200 });
    }

    const amount = amountStr ? parseFloat(amountStr) : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      postbackLogger.warn({ traceId, clickId, amount }, "Postback invalid amount");
      return new NextResponse("OK", { status: 200 });
    }

    // Look up click — return 200 if not found (network expects 200)
    const click = await OfferClick.findOne({ clickId }).lean();
    if (!click) {
      postbackLogger.info({ traceId, clickId }, "Postback: unknown click_id");
      return new NextResponse("OK", { status: 200 });
    }

    // Find linked offer and campaign
    const offer = await Offer.findById(click.offer).lean();
    if (!offer) {
      postbackLogger.warn({ traceId, clickId }, "Postback: offer not found");
      return new NextResponse("OK", { status: 200 });
    }

    // Try to find linked campaign (for direct advertiser campaigns)
    const campaign = await Campaign.findOne({ offerId: click.offer });

    // Secret validation — only enforce if a campaign is linked (direct advertiser flow).
    // Network offers (AdToWall, Torox, etc.) don't send a secret; skip check for those.
    if (campaign) {
      const expectedSecret = campaign.postbackSecret ?? GLOBAL_SECRET;
      if (!secret || secret !== expectedSecret) {
        postbackLogger.warn(
          { traceId, clickId, hostname: ip },
          "Postback rejected: invalid secret"
        );
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    // Attribution window check
    const attributionWindowDays = campaign?.attributionWindowDays ?? 30;
    const windowMs = attributionWindowDays * 24 * 60 * 60 * 1000;
    if (Date.now() - click.createdAt.getTime() > windowMs) {
      postbackLogger.info(
        { traceId, clickId, clickAge: Date.now() - click.createdAt.getTime() },
        "Postback outside attribution window"
      );
      return new NextResponse("OK", { status: 200 });
    }

    // Campaign budget/cap checks (with lazy daily reset)
    if (campaign) {
      if (!isToday(campaign.lastResetDate ?? new Date(0))) {
        campaign.spentTodayCents = 0;
        campaign.conversionsDayCount = 0;
        campaign.lastResetDate = new Date();
        campaign.spendAlertFired = false;
        await campaign.save();
      }

      if (campaign.dailyCap && campaign.conversionsDayCount >= campaign.dailyCap) {
        postbackLogger.info({ traceId, clickId, campaignId: campaign._id }, "Daily cap reached");
        return new NextResponse("OK", { status: 200 });
      }

      if (
        campaign.totalBudgetCents !== undefined &&
        campaign.spentTotalCents >= campaign.totalBudgetCents
      ) {
        postbackLogger.info({ traceId, clickId }, "Budget exhausted");
        return new NextResponse("OK", { status: 200 });
      }
    }

    const publisherPayoutUsd = campaign
      ? campaign.publisherPayoutCents / 100
      : amount;
    const advertiserPayoutUsd = campaign
      ? campaign.payoutPerConversionCents / 100
      : amount;

    const publisherPayoutCents = Math.round(publisherPayoutUsd * 100);
    const advertiserPayoutCents = Math.round(advertiserPayoutUsd * 100);

    // ATOMIC TRANSACTION: create conversion + debit advertiser wallet
    const session = await mongoose.startSession();
    let created = false;
    try {
      await session.withTransaction(async () => {
        // Pre-flight: check advertiser wallet has sufficient balance
        if (campaign) {
          const advWallet = await Wallet.findOne(
            { ownerRef: campaign.advertiser, ownerType: "advertiser" },
            null,
            { session }
          );
          if (!advWallet || advWallet.balance < publisherPayoutCents) {
            postbackLogger.warn(
              { traceId, clickId, campaignId: campaign._id },
              "Insufficient advertiser balance"
            );
            throw new Error("INSUFFICIENT_ADVERTISER_BALANCE");
          }

          // Debit advertiser wallet
          advWallet.balance -= advertiserPayoutCents;
          await advWallet.save({ session });
          await WalletTransaction.create(
            [{
              wallet: advWallet._id,
              type: "ad_spend",
              amount: -advertiserPayoutCents,
              reference: clickId,
            }],
            { session }
          );
        }

        // Create OfferConversion (unique index on clickId prevents duplicates — idempotent)
        await OfferConversion.create(
          [{
            offer: click.offer,
            placement: click.placement,
            publisher: click.publisher,
            campaign: campaign?._id,
            click: click._id,
            clickId,
            subId: click.subId,
            payoutUsd: publisherPayoutUsd,
            advertiserPayoutUsd,
            conversionStatus: "pending",
            conversionIp: ip,
            source: campaign ? "direct" : "network",
            raw: Object.fromEntries(params.entries()),
          }],
          { session }
        );

        // Update offer stats
        await Offer.findByIdAndUpdate(
          click.offer,
          { $inc: { statsConversions: 1, statsRevPubUsd: publisherPayoutUsd } },
          { session }
        );

        await AuditLog.create(
          [{
            action: "conversion.created",
            actorRole: "system",
            targetId: click._id,
            targetModel: "OfferClick",
            meta: { clickId, publisherPayoutUsd, advertiserPayoutUsd, campaignId: campaign?._id },
            ip,
          }],
          { session }
        );

        created = true;
      });
    } catch (txErr: any) {
      // E11000 = duplicate clickId → already processed → idempotent 200
      if (txErr?.code === 11000 || txErr?.message?.includes("E11000")) {
        postbackLogger.info({ traceId, clickId }, "Postback duplicate — idempotent OK");
        return new NextResponse("OK", { status: 200 });
      }
      if (txErr?.message === "INSUFFICIENT_ADVERTISER_BALANCE") {
        return new NextResponse("OK", { status: 200 });
      }
      throw txErr;
    } finally {
      await session.endSession();
    }

    if (created && campaign) {
      // Update campaign stats (outside transaction — best-effort)
      await Campaign.findByIdAndUpdate(campaign._id, {
        $inc: {
          spentTodayCents: advertiserPayoutCents,
          spentTotalCents: advertiserPayoutCents,
          conversionsDayCount: 1,
          statsConversions: 1,
          statsSpendCents: advertiserPayoutCents,
        },
      });

      // Check spend alert threshold
      if (
        campaign.spendAlertThreshold !== undefined &&
        !campaign.spendAlertFired &&
        campaign.totalBudgetCents !== undefined
      ) {
        const newSpent = campaign.spentTotalCents + advertiserPayoutCents;
        const pct = (newSpent / campaign.totalBudgetCents) * 100;
        if (pct >= campaign.spendAlertThreshold) {
          await Campaign.findByIdAndUpdate(campaign._id, { spendAlertFired: true });
          // TODO: send email notification via lib/email.ts
          postbackLogger.info(
            { traceId, campaignId: campaign._id, pct: Math.round(pct) },
            "Spend alert threshold reached"
          );
        }
      }
    }

    postbackLogger.info(
      { traceId, clickId, publisherPayoutUsd, created },
      "Postback processed"
    );
    return new NextResponse("OK", { status: 200 });
  } catch (err: any) {
    postbackLogger.error({ traceId, err: err?.message }, "Postback error");
    return new NextResponse("OK", { status: 200 });
  }
}
