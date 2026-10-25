# CRAVE

Premium, mobile-first food ordering for Lagos, with an operational admin workspace and a private owner portal.

## Phase 7 status

The foundation includes:

- Next.js 16 App Router, React 19, TypeScript and Tailwind CSS 4.
- CRAVE brand assets, responsive customer navigation, workspace shells and reduced-motion support.
- PostgreSQL architecture with Prisma 7, initial Lagos/menu seed data and RBAC foundations.
- Phone authentication: registration by preferred name + phone, user-selected SMS/WhatsApp OTP, six-digit PIN creation, PIN login, OTP recovery and logout.
- Opaque database sessions with a sliding 120-hour lifetime.
- Server-side route and permission guards for `/account`, `/admin` and `/owner`.
- Versioned authentication APIs under `/api/v1/auth`.
- Editorial catalogue and configurable product variants/add-ons.
- Persistent guest and customer carts with server-authoritative pricing.
- Delivery/pickup checkout, Lagos delivery zones and saved addresses.
- Provider-isolated Strowallet checkout and server-to-server status verification.
- Persisted orders, payment events, visual tracking, history, favourites and reorder.
- Permission-aware operations dashboard, searchable order register and kitchen workflow.
- Loud opt-in kitchen alerts with three synthesized demo tones and a device-local custom ringtone.
- Product lifecycle controls and direct image/video uploads to Vercel Blob.
- Customer status management, staff invitations/roles and inventory foundations.
- Staff payroll wallets with role-and-salary onboarding, Lagos month-end salary credits, Super Admin memo-required funding, withdrawals and transaction history. Salary funding defaults to prefunded capital (no gross-revenue debit); a Super Admin can switch subsequent postings to gross revenue with matching ledger debits.
- Guarded owner withdrawal requests and independently approved Strowallet bank transfers.
- Backend-validated coupons, configurable bilateral referral credits, customer Crave Credit wallets, campaign publishing and referral analytics.

- Complete double-entry accounting, financial periods, reporting, owner management, effective-dated ownership, approved profit allocation and owner statements.
- Railway-ready standalone deployment, PostgreSQL readiness health checks, baseline migrations, production security headers and automated quality gates.

## Local setup

1. Install Node.js 22 LTS and pnpm 11.
2. Copy `.env.example` to `.env` and replace every secret.
3. Create a PostgreSQL database and set `DATABASE_URL`.
4. Run `pnpm install`.
5. Run `pnpm db:migrate --name phase_2_customer_ordering`.
6. Run `pnpm db:seed`.
7. Run `pnpm dev`.

Without `STROWALLET_PUBLIC_KEY`, development OTP works only when `AUTH_MOCK_OTP=true`; the code is clearly displayed as a development code. Production refuses to send mocked codes.

For local payment testing, set `PAYMENT_PROVIDER=mock`. Production refuses the mock provider. Live checkout requires `PAYMENT_PROVIDER=strowallet`, `STROWALLET_PUBLIC_KEY`, and a public `NEXT_PUBLIC_APP_URL` so Strowallet can reach the callback. Callback and browser redirects never mark an order paid by themselves; the server verifies checkout status directly with Strowallet.

For media uploads, connect a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`. For owner payouts, set a distinct `FINANCIAL_DATA_KEY`; use `PAYOUT_PROVIDER=mock` only locally or `strowallet` with `STROWALLET_TRANSFER_MODE=sandbox|live`. Transfer callbacks are verified server-to-server before wallet ledgers change.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

See [ARCHITECTURE.md](./ARCHITECTURE.md), [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md), [DATABASE.md](./DATABASE.md), [API.md](./API.md), [PERMISSIONS.md](./PERMISSIONS.md), [ACCOUNTING.md](./ACCOUNTING.md), [PROFIT_SPLIT.md](./PROFIT_SPLIT.md), [QUALITY.md](./QUALITY.md), and [DEPLOYMENT.md](./DEPLOYMENT.md).
