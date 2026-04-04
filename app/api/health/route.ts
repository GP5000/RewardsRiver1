// app/api/health/route.ts
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    const dbState = mongoose.connection.readyState;
    // 1 = connected, 2 = connecting
    const dbStatus = dbState === 1 ? "connected" : dbState === 2 ? "connecting" : "disconnected";

    return NextResponse.json(
      { status: "ok", db: dbStatus, ts: Date.now() },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { status: "error", db: "disconnected", ts: Date.now() },
      { status: 503 }
    );
  }
}
