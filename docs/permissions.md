# RewardsRiver — Permission Matrix

Enforced via role checks in route handlers using `requirePublisher()`, `requireAdvertiser()`,
and `requireAdmin()`. No RBAC engine — just role checks and this doc.

| Action | Admin | Advertiser | Publisher |
|--------|:-----:|:----------:|:---------:|
| Approve campaign | Y | N | N |
| Reject campaign | Y | N | N |
| Pause own campaign | N | Y | N |
| Pause any campaign | Y | N | N |
| Resume own campaign | N | Y | N |
| Approve conversion | Y | N | N |
| Reject conversion | Y | N | N |
| View own conversions | N | Y (via campaign) | Y |
| Request payout | N | N | Y |
| Approve payout | Y | N | N |
| Reject payout | Y | N | N |
| View system analytics | Y | N | N |
| View own analytics | N | Y | Y |
| Edit SystemSettings | Y | N | N |
| Block IP | Y | N | N |
| Flag publisher | Y | N | N |
| View fraud signals | Y | N | N |
| Create campaign | N | Y | N |
| Register publisher | Y | N | self-service |
| Register advertiser | Y | self-service | N |
| Upload campaign image | N | Y (own campaigns only) | N |
| Upload any image | Y | N | N |
| Regenerate own API key | N | Y | Y |
| View publisher list | Y | N | N |
| View advertiser list | Y | N | N |
| Suspend publisher | Y | N | N |
| Suspend advertiser | Y | N | N |
