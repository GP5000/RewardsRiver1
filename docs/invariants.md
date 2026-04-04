# RewardsRiver — System Invariants

Paste this list into LLM context when generating code. Reference in PR reviews.
These invariants must never be violated. Each is enforced programmatically.

---

1. **Wallet balance never negative**
   `Wallet.balance` must be >= 0 at all times. Enforced via pre-flight check inside
   `session.withTransaction()` in `walletService.debitWallet()`:
   ```ts
   if (wallet.balance < amountCents) throw new Error("INSUFFICIENT_BALANCE");
   ```

2. **Every WalletTransaction has a source**
   Every `WalletTransaction` must have a `reference` field pointing to the
   `OfferConversion._id`, `PayoutRequest._id`, or admin action that caused it.

3. **OfferConversion ↔ OfferClick is 1:1**
   Enforced by unique index on `OfferConversion.clickId` (sparse). A second postback
   for the same `clickId` will fail with E11000 — caught and returned as 200 (idempotent).

4. **Active Campaign always has a linked Offer**
   When `Campaign.status === "active"`, `Campaign.offerId` must be non-null.
   Set atomically in `campaignService.approveCampaign()` inside a transaction.

5. **Advertiser wallet debited before conversion is created**
   Inside `session.withTransaction()` in the postback handler:
   debit advertiser wallet first, then create `OfferConversion`. If the debit throws
   `INSUFFICIENT_BALANCE`, no conversion is written.

6. **Publisher wallet credited only after conversion is approved**
   `walletService.creditWallet()` for publishers is called only inside
   `conversionService.approveConversion()`, after `conversionStatus` is set to `"approved"`.

7. **Referral bonus credited in the same transaction as publisher credit**
   If `publisher.referredBy` exists and is within `SystemSettings.referralWindowDays`,
   the referral bonus credit is part of the same `session.withTransaction()` call as
   the publisher's `conversion_credit`.

8. **AuditLog written in the same transaction as the action**
   `AuditLog.create([...], { session })` is called inside every `session.withTransaction()`
   block that mutates financial state.

9. **Publisher payout < advertiser payout (platform keeps margin)**
   `Campaign.publisherPayoutCents < Campaign.payoutPerConversionCents` must always hold.
   Validated on campaign creation: throw if equal or greater.

10. **Per-postback pre-flight: advertiser wallet balance check**
    Before creating any `OfferConversion`, check:
    ```ts
    if (wallet.balance < campaign.publisherPayoutCents) throw "INSUFFICIENT_BALANCE";
    ```
    This runs inside the transaction so it's race-condition safe.
