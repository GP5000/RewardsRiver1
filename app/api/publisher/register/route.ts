// app/api/publisher/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { connectDB } from "@/server/db/connect";
import { User } from "@/server/db/models/User";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";
import { Wallet } from "@/server/db/models/Wallet";

function generateReferralCode(): string {
  return "RR-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { email, password, publisherName, website, ref } = body as {
      email?: string;
      password?: string;
      publisherName?: string;
      website?: string;
      ref?: string;
    };

    if (!email || !password || !publisherName) {
      return NextResponse.json(
        { ok: false, error: "email, password and publisherName are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Generate a unique referral code
    let referralCode = generateReferralCode();
    let collision = await PublisherProfile.findOne({ referralCode }).lean();
    while (collision) {
      referralCode = generateReferralCode();
      collision = await PublisherProfile.findOne({ referralCode }).lean();
    }

    // Resolve referrer if ?ref= was provided
    let referredBy: import("mongoose").Types.ObjectId | undefined;
    if (ref) {
      const referrer = await PublisherProfile.findOne({ referralCode: ref }).select("_id").lean();
      if (referrer) {
        referredBy = referrer._id as import("mongoose").Types.ObjectId;
      }
    }

    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      role: "publisher",
    });

    const profile = await PublisherProfile.create({
      user: user._id,
      name: publisherName.trim(),
      website: website?.trim() || undefined,
      status: "active",
      referralCode,
      referredBy,
    });

    // Create wallet for the publisher
    await Wallet.create({
      ownerRef: profile._id,
      ownerType: "publisher",
      currency: "USD",
      balance: 0,
    });

    return NextResponse.json(
      {
        ok: true,
        userId: user._id.toString(),
        publisherId: profile._id.toString(),
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("PUBLISHER REGISTER ERROR:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal Server Error",
        message: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
