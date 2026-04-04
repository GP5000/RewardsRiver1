# RewardsRiver — State Machines

State transitions are enforced in the service layer (`server/services/`).
Any transition not listed here will throw `INVALID_TRANSITION` at runtime.

**Idempotency rule**: if an admin action targets an entity already in the target
state, the service returns without error (no duplicate work, no error thrown).

---

## Campaign Status

```
draft → pending_review   (advertiser submits for review)
pending_review → active  (admin approves; atomically creates linked Offer)
pending_review → archived (admin rejects)
active → paused          (advertiser or admin)
paused → active          (advertiser or admin; validates budget + dates first)
active → archived        (admin only)
paused → archived        (admin only)
```

**Note**: On `pending_review → active`, an `Offer` document is created inside the
same MongoDB transaction. `campaign.offerId` is set atomically. If the transaction
fails, neither the status change nor the Offer is persisted.

---

## OfferConversion Status

```
pending → approved   (admin approves; credits publisher wallet)
pending → rejected   (admin rejects)
approved → paid      (informational — set when the publisher's payout is marked paid)
```

Publisher wallet is credited only on `→ approved`. No money moves on `→ rejected`.

---

## PayoutRequest Status

```
pending → processing   (admin acknowledges and begins processing)
processing → paid      (admin marks paid; writes WalletTransaction payout_settled)
processing → rejected  (admin rejects; refunds balance to publisher wallet)
pending → rejected     (admin rejects before processing; refunds balance)
```

On `→ rejected`: publisher `Wallet.balance` is refunded atomically.
On `→ paid`: `WalletTransaction { type: "payout_settled" }` is written.
