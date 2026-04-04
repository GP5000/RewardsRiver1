# Offer Import Files

JSON arrays imported via `scripts/import-offers.ts`.

## Quick start (test offers)

```bash
npx ts-node -r tsconfig-paths/register scripts/import-offers.ts --file offers/test-offers.json
```

Dry-run first:

```bash
npx ts-node -r tsconfig-paths/register scripts/import-offers.ts --file offers/test-offers.json --dry-run
```

## Real network setup

### 1. CPAGrip (easiest to start)

Sign up: https://www.cpagrip.com

**Your postback URL to give them:**
```
https://moonmiloes.io/api/postback?click_id={subid1}&amount={payout}&secret=YOUR_RR_CONVERT_SECRET
```

**Offer URL format (put in redirectUrl):**
```
https://www.cpagrip.com/show.php?l=0&u=YOUR_USER_ID&id=OFFER_ID&s1={click_id}
```

CPAGrip sends `{subid1}` in the postback = what you sent as `s1=` in the click URL.

---

### 2. Offertoro (offerwall-native)

Sign up: https://www.offertoro.com

**Your postback URL:**
```
https://moonmiloes.io/api/postback?click_id={custom}&amount={reward_value}&secret=YOUR_RR_CONVERT_SECRET
```

**Offer URL format:**
```
https://www.offertoro.com/ifr/show/YOUR_PUB_ID/OFFER_ID?custom={click_id}
```

---

### 3. AdGem (mobile-first offerwall)

Sign up: https://adgem.com

**Your postback URL:**
```
https://moonmiloes.io/api/postback?click_id=[CUSTOM_1]&amount=[AMOUNT]&secret=YOUR_RR_CONVERT_SECRET
```

**Offer URL format:**
```
https://adgem.com/offer?pub_id=YOUR_ID&offer_id=OFFER_ID&custom1={click_id}
```

AdGem sends `[CUSTOM_1]` in the postback.

---

### 4. Lootably

Sign up: https://lootably.com

**Your postback URL:**
```
https://moonmiloes.io/api/postback?click_id={custom}&amount={payout}&secret=YOUR_RR_CONVERT_SECRET
```

---

## Important: {click_id} macro

Every `redirectUrl` must contain one of these macros:

| Macro | Supported |
|-------|-----------|
| `{click_id}` | ✓ |
| `{clickid}` | ✓ |
| `[click_id]` | ✓ |
| `%%CLICK_ID%%` | ✓ |
| `{transaction_id}` | ✓ |

The import script will warn if none are present.

## RR_CONVERT_SECRET

Your postback secret is in `.env.local` as `RR_CONVERT_SECRET`.
Give this to networks as the `secret=` param in your postback URL.
Keep it private — anyone with this secret can fire fake conversions.
