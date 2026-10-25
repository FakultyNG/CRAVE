# Architecture

CRAVE starts as a modular monolith. The browser, Next.js server components, REST route handlers and background-ready provider adapters live in one deployable application; PostgreSQL remains the source of truth.

## Boundaries

- `src/app`: route composition and `/api/v1` HTTP contracts.
- `src/components`: shared visual and interaction primitives.
- `src/lib/auth`: phone/PIN identity, OTP delivery, sessions and authorization.
- `src/lib/commerce`: cart ownership, authoritative pricing and order access.
- `src/lib/payments`: provider-neutral checkout/status contracts and the Strowallet adapter.
- `src/lib/operations`: controlled order-state transitions for the kitchen and dispatch workflow.
- `src/lib/payouts` and `src/lib/finance`: bank-transfer adapters, Lagos calendar rules, encrypted banking fields and ledger-backed owner balances.
- `src/lib/db.ts`: server-only Prisma client boundary.
- `prisma`: schema, migrations and deterministic seed data.
- `public/brand`: supplied CRAVE artwork with web-safe names.

Customer, admin and owner interfaces share brand tokens but have separate route trees and access rules. Admin and owner authorization is performed in the data-access layer and repeated by every future protected mutation.

## Authentication sequence

Registration is `channel selection → preferred name + phone → OTP → PIN → session`. Login is `phone + PIN`. PIN recovery uses a fresh SMS or WhatsApp OTP. PINs use salted scrypt hashes; OTP values use a keyed hash and expire after ten minutes.

Sessions use random opaque tokens. Only a SHA-256 token hash is stored in PostgreSQL. The secure HTTP-only cookie and database expiry slide by 120 hours on app access; revoked, suspended or expired sessions are rejected.

## Provider boundaries

Strowallet OTP is isolated in `src/lib/auth/strowallet.ts`; checkout and verification live in `src/lib/payments`. Browser returns and callbacks are untrusted signals. Payment becomes `PAID` only after a server-to-server status lookup, amount/currency checks when returned, and an idempotent database transaction. Payout, notification, object-storage and queue adapters follow in later phases.

## Phase evolution

Phase 2 adds catalogue configuration, carts, addresses, delivery zones, immutable order snapshots, status history and payment audit records. Marketing arrives in Phase 4, double-entry accounting in Phase 5, and effective-dated ownership/profit ledgers in Phase 6. Each addition must ship through reviewed migrations, not ad-hoc database changes.

Phase 3 stays inside the modular monolith: synchronous admin APIs and provider webhooks use route handlers, PostgreSQL is the operational source of truth, kitchen stations poll a compact authenticated feed every six seconds, and Vercel Blob receives product media directly from the browser using short-lived upload tokens. The owner payout rail is deliberately split into request, independent approval, transfer initiation and provider verification.
