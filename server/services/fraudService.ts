/**
 * server/services/fraudService.ts
 * Fraud detection signal queries and enforcement actions.
 */

import mongoose from "mongoose";
import { OfferClick } from "@/server/db/models/OfferClick";
import { OfferConversion } from "@/server/db/models/OfferConversion";
import { BlockedIp } from "@/server/db/models/BlockedIp";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";
import { AuditLog } from "@/server/db/models/AuditLog";
import { getSystemSettings } from "@/server/db/models/SystemSettings";

export interface FraudSignal {
  type: "ip_velocity" | "cvr_anomaly" | "ip_mismatch" | "subid_duplication";
  entity: string;
  entityType: "ip" | "publisher";
  count: number;
  threshold: number;
  lastSeen: Date;
}

/**
 * Returns active fraud signals based on SystemSettings thresholds.
 */
export async function getFraudSignals(): Promise<FraudSignal[]> {
  const settings = await getSystemSettings();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const signals: FraudSignal[] = [];

  // 1. IP velocity: IPs with too many clicks in 24h
  const ipVelocity = await OfferClick.aggregate([
    { $match: { createdAt: { $gte: since24h }, ip: { $ne: null } } },
    { $group: { _id: "$ip", count: { $sum: 1 }, lastSeen: { $max: "$createdAt" } } },
    { $match: { count: { $gt: settings.fraudClickVelocityLimit } } },
    { $sort: { count: -1 } },
    { $limit: 100 },
  ]);

  for (const row of ipVelocity) {
    signals.push({
      type: "ip_velocity",
      entity: row._id,
      entityType: "ip",
      count: row.count,
      threshold: settings.fraudClickVelocityLimit,
      lastSeen: row.lastSeen,
    });
  }

  // 2. CVR anomaly: publishers with very high CVR in 24h
  const pubClicks = await OfferClick.aggregate([
    { $match: { createdAt: { $gte: since24h } } },
    { $group: { _id: "$publisher", clicks: { $sum: 1 } } },
  ]);

  const pubConvs = await OfferConversion.aggregate([
    { $match: { createdAt: { $gte: since24h } } },
    { $group: { _id: "$publisher", conversions: { $sum: 1 }, lastSeen: { $max: "$createdAt" } } },
  ]);

  const convMap = new Map(pubConvs.map((r: any) => [r._id.toString(), r]));
  for (const row of pubClicks) {
    const pubId = row._id.toString();
    const convRow = convMap.get(pubId);
    if (!convRow) continue;
    const cvr = convRow.conversions / row.clicks;
    if (cvr > settings.fraudCvrThreshold) {
      signals.push({
        type: "cvr_anomaly",
        entity: pubId,
        entityType: "publisher",
        count: convRow.conversions,
        threshold: Math.round(settings.fraudCvrThreshold * 100),
        lastSeen: convRow.lastSeen,
      });
    }
  }

  // 3. IP mismatch: conversions where postback IP doesn't match click IP
  const mismatchAgg = await OfferConversion.aggregate([
    { $match: { createdAt: { $gte: since24h }, conversionIp: { $ne: null } } },
    {
      $lookup: {
        from: "offerclicks",
        localField: "click",
        foreignField: "_id",
        as: "clickDoc",
      },
    },
    { $unwind: { path: "$clickDoc", preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: "$publisher",
        total: { $sum: 1 },
        mismatches: {
          $sum: {
            $cond: [{ $ne: ["$conversionIp", "$clickDoc.ip"] }, 1, 0],
          },
        },
        lastSeen: { $max: "$createdAt" },
      },
    },
    {
      $addFields: {
        mismatchRatio: { $divide: ["$mismatches", "$total"] },
      },
    },
    { $match: { mismatchRatio: { $gt: settings.fraudIpMismatchThreshold } } },
  ]);

  for (const row of mismatchAgg) {
    signals.push({
      type: "ip_mismatch",
      entity: row._id.toString(),
      entityType: "publisher",
      count: row.mismatches,
      threshold: Math.round(settings.fraudIpMismatchThreshold * 100),
      lastSeen: row.lastSeen,
    });
  }

  return signals;
}

/**
 * Blocks an IP address permanently (or until expiresAt).
 */
export async function blockIp(
  ip: string,
  reason: string,
  blockedBy: mongoose.Types.ObjectId,
  expiresAt?: Date
): Promise<void> {
  await BlockedIp.findOneAndUpdate(
    { ip },
    { ip, reason, blockedBy, expiresAt: expiresAt ?? null },
    { upsert: true }
  );
  await AuditLog.create({
    action: "ip.blocked",
    actorId: blockedBy,
    actorRole: "admin",
    meta: { ip, reason },
  });
}

/**
 * Returns true if the given IP is currently blocked.
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  const entry = await BlockedIp.findOne({ ip }).lean();
  if (!entry) return false;
  if (entry.expiresAt && entry.expiresAt < new Date()) {
    await BlockedIp.deleteOne({ ip });
    return false;
  }
  return true;
}
