// app/api/publisher/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/server/db/connect";
import { requirePublisher } from "@/server/auth/publisher";
import { PublisherProfile } from "@/server/db/models/PublisherProfile";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
} as const;

/**
 * Helper: find the publisher profile document.
 *
 * In your setup, requirePublisher() returns a "publisherId" that should be
 * the PublisherProfile _id. To be extra safe, we also fall back to matching
 * by user field if needed.
 */
async function getPublisherDoc(publisherId: string) {
  let doc = await PublisherProfile.findById(publisherId);
  if (!doc) {
    doc = await PublisherProfile.findOne({ user: publisherId });
  }
  return doc;
}

/* ─────────────────────────────────────────────
   GET /api/publisher/settings
   ───────────────────────────────────────────── */
export async function GET() {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();

    const publisher = await getPublisherDoc(publisherId);

    if (!publisher) {
      console.warn(
        "[publisher/settings][GET] Publisher not found for id:",
        publisherId
      );
      return NextResponse.json(
        { ok: false, error: "Publisher not found" },
        { status: 404, headers: NO_STORE }
      );
    }

    // Auto-generate apiKey if missing, but NEVER create a new document.
    if (!publisher.apiKey) {
      publisher.apiKey = crypto.randomBytes(24).toString("hex");
      await publisher.save();
    }

    return NextResponse.json(
      {
        ok: true,
        settings: {
          name: publisher.name ?? "",
          contactEmail: publisher.contactEmail ?? "",
          apiKey: publisher.apiKey ?? "",
          postbackUrl: publisher.postbackUrl ?? "",
          allowedDomains: (publisher.allowedDomains ?? []).join(", "),
          ipWhitelist: (publisher.ipWhitelist ?? []).join(", "),
          trafficSources: (publisher.trafficSources ?? []).join(", "),
        },
      },
      { headers: NO_STORE }
    );
  } catch (err: any) {
    console.error("[publisher/settings] GET ERROR", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to load settings" },
      { status: 500, headers: NO_STORE }
    );
  }
}

/* ─────────────────────────────────────────────
   PUT /api/publisher/settings
   ───────────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { publisherId } = await requirePublisher();
    const body = await req.json();

    const normalizeList = (val: unknown): string[] => {
      if (typeof val !== "string") return [];
      return val
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    };

    const publisher = await getPublisherDoc(publisherId);

    if (!publisher) {
      console.warn(
        "[publisher/settings][PUT] Publisher not found for id:",
        publisherId
      );
      return NextResponse.json(
        { ok: false, error: "Publisher not found" },
        { status: 404, headers: NO_STORE }
      );
    }

    // ✅ Only update allowed fields – we NEVER touch `user`,
    // so the required `user` field is preserved and validation passes.
    if (typeof body.name === "string") {
      publisher.name = body.name;
    }
    if (typeof body.contactEmail === "string") {
      (publisher as any).contactEmail = body.contactEmail;
    }
    if (typeof body.postbackUrl === "string") {
      (publisher as any).postbackUrl = body.postbackUrl;
    }

    (publisher as any).allowedDomains = normalizeList(body.allowedDomains);
    (publisher as any).ipWhitelist = normalizeList(body.ipWhitelist);
    (publisher as any).trafficSources = normalizeList(body.trafficSources);

    await publisher.save(); // <- uses existing doc with user already set

    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (err: any) {
    console.error("[publisher/settings] PUT ERROR", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Failed to save settings" },
      { status: 500, headers: NO_STORE }
    );
  }
}
