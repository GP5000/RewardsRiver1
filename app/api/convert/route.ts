// app/api/convert/route.ts
// DEPRECATED — this route is no longer used.
// All conversion postbacks must go through /api/postback which enforces:
//   - click ID matching
//   - attribution window
//   - budget/cap checks
//   - atomic wallet debit
//   - pending→approved state machine
//   - idempotency via unique index on OfferConversion.clickId
//
// If you have a legacy integration pointing here, update it to:
//   GET/POST /api/postback?click_id={click_id}&amount={payout}&secret={secret}
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function gone() {
  return NextResponse.json(
    {
      ok: false,
      error: "This endpoint is deprecated. Use /api/postback instead.",
    },
    { status: 410 }
  );
}

export const GET = gone;
export const POST = gone;
