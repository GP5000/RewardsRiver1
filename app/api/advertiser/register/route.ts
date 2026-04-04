// app/api/advertiser/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/server/db/connect";
import { registerAdvertiser } from "@/server/services/advertiserService";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const { email, password, companyName, websiteUrl } = body as {
      email?: string;
      password?: string;
      companyName?: string;
      websiteUrl?: string;
    };

    if (!email || !password || !companyName) {
      return NextResponse.json(
        { ok: false, error: "email, password and companyName are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const result = await registerAdvertiser({
      email: email.toLowerCase().trim(),
      password,
      companyName,
      websiteUrl,
    });

    return NextResponse.json(
      {
        ok: true,
        userId: result.userId,
        advertiserId: result.advertiserId,
        // Full API key shown once — not stored plaintext
        apiKey: result.apiKey,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err?.message === "EMAIL_ALREADY_EXISTS") {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }
    console.error("ADVERTISER REGISTER ERROR:", err);
    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
