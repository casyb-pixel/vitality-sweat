# Email + referrals (Phase 1a)

## Referrals

- Each profile gets a unique `referral_code` (e.g. `VSAB12CD`).
- Invite URL shape: `/?auth=signup&next=/app&ref=CODE` (also works as `/app?ref=CODE` — code is stored in session before auth redirect).
- On signup, `user_metadata.ref` is read by `handle_new_user` and stored as `profiles.referred_by`.
- Soft rewards only: profile badges (“brought X friends”) — no paid credits.

## Transactional email

Outbox table: `public.email_outbox` (`welcome` | `weekly_tip`; statuses `pending` | `sent` | `failed` | `skipped`).

### Env vars

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Live sends via Resend. If unset, rows stay `pending` (never fake-sent). |
| `EMAIL_FROM` | e.g. `Vitality Sweat <hello@vitalitysweat.com>` |
| `EMAIL_REPLY_TO` | Optional reply-to |
| `CRON_SECRET` | Bearer token for `/api/cron/weekly-tip` |

### Welcome email

Triggered after signup:

1. Password signup with immediate session → `POST /api/app/emails/welcome`
2. Magic / confirm path with `?joined=1` → AuthGate fires the same endpoint

Idempotent per user (skips if welcome already `pending` or `sent`).

### Weekly tip stub

`POST /api/cron/weekly-tip` with header `Authorization: Bearer $CRON_SECRET`.

- Enqueues `weekly_tip` for recent members (stub copy).
- Sends only when `RESEND_API_KEY` is set; otherwise leaves `pending`.
- Wire from Render Cron / GitHub Actions later — do not mark sent without a provider.
