# RewardsRiver — Key Architectural Decisions

---

## Monolith over microservices
**Decision**: Single Next.js app with API routes for all backend logic.
**Why**: Platform is early-stage. Microservices would add infrastructure complexity
with no benefit at current scale. Revisit if tracking endpoint throughput exceeds
~500 req/s sustained.

## MongoDB transactions for all financial operations
**Decision**: All wallet debit/credit operations use `session.withTransaction()`.
**Why**: Prevents double-spend bugs and ensures AuditLog entries are always
consistent with the operation they describe. MongoDB replica set required (Atlas
clusters support this by default).

## Service layer (not logic in route handlers)
**Decision**: Business logic lives in `server/services/`, not in route handlers.
**Why**: `approveConversion()` needs to be callable from both the admin UI route
and a future auto-approval cron job. Services enable this without code duplication.

## Single NextAuth instance for all roles
**Decision**: One `/api/auth/[...nextauth]` handles publishers, advertisers, and admins.
**Why**: Simpler than two separate NextAuth configs. The JWT token carries `role`,
and the middleware inspects `role` to route to the correct login page on mismatch.

## Advertisers prepaid only
**Decision**: Advertiser wallet must have sufficient balance before any conversion
is recorded. Postbacks are rejected with "INSUFFICIENT_BALANCE" if the wallet
can't cover the publisher payout.
**Why**: Eliminates accounts-receivable complexity. Advertisers top up before spending.

## Per-campaign postback secrets (not global)
**Decision**: Each `Campaign` has its own `postbackSecret`. The global
`RR_CONVERT_SECRET` env var is an admin-only fallback.
**Why**: A leaked global secret exposes all campaigns. Per-campaign secrets limit
blast radius to one advertiser.

## Lazy daily budget reset (not cron)
**Decision**: On each postback, check if `campaign.lastResetDate < today`. If so,
reset `spentTodayCents` and `conversionsDayCount` before the budget check.
**Why**: Eliminates need for a scheduled cron job that might miss resets if the
server is down at midnight.

## R2 public URL (not key) in Campaign.imageUrl
**Decision**: `Campaign.imageUrl` stores the full public R2 URL.
**Why**: Consistent — no need for a URL construction function. The R2 public URL
is stable and can be used directly in `<img src>` without a transform step.

## API keys as SHA-256 hashes only
**Decision**: `apiKeyHash` stores `SHA-256(key)`. Full key shown once at generation.
**Why**: A database leak must not expose API keys. Same pattern as GitHub PATs.
Verification: `SHA-256(submitted_key) === stored_hash`.
