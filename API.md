# API

All application endpoints are versioned under `/api/v1`. JSON errors use `{ "error": { "message", "fields?" } }`.

## Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/otp/request` | Create and deliver a registration or PIN-reset challenge |
| POST | `/auth/otp/verify` | Verify a six-digit OTP and issue a short-lived completion token |
| POST | `/auth/register/complete` | Set the initial PIN, create the user and start a session |
| POST | `/auth/login` | Sign in with phone and six-digit PIN |
| POST | `/auth/pin/reset` | Replace a PIN after OTP verification and revoke old sessions |
| POST | `/auth/session/refresh` | Renew the sliding 120-hour session |
| GET | `/auth/me` | Return the safe current-user DTO and renew the session |
| POST | `/auth/logout` | Revoke the current session |

OTP requests are limited by phone and IP, expire after ten minutes and allow five verification attempts. PIN login locks temporarily after five incorrect attempts. Provider credentials never reach the client.

Strowallet receives the documented query fields `public_key`, `phone`, and `otp` at its SMS or WhatsApp OTP endpoint. Live delivery is not attempted until the key is configured.

## Customer ordering

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/catalog` | Active products with variants, options and media |
| GET, POST | `/cart` | Read the current cart or add a configured item |
| PATCH, DELETE | `/cart/:itemId` | Change quantity or remove an owned item |
| POST | `/checkout/quote` | Revalidate the cart and calculate delivery |
| POST | `/checkout` | Snapshot an order and initialize Strowallet checkout |
| GET | `/payments/:reference/status` | Verify payment with the provider and return order status |
| GET, POST | `/payments/webhooks/strowallet` | Record a provider signal and run independent verification |
| GET | `/orders` | Customer or guest order history |
| GET | `/orders/:id` | Owned order detail and status history |
| POST | `/orders/:id/reorder` | Rebuild an owned order using current availability/prices |
| GET, POST | `/customers/me/addresses` | List or save authenticated customer addresses |
| DELETE | `/customers/me/addresses/:id` | Delete an owned address |
| GET, POST | `/customers/me/favourites` | List or toggle favourites |

Guest resources are scoped by a random HTTP-only cookie whose hash is stored in PostgreSQL. Authenticated resources are scoped by user ID. Checkout ignores browser prices and rebuilds totals from the active catalogue. Payment callbacks are stored for audit, but only a successful status query can confirm payment.

## Operations administration

| Method | Endpoint | Permission |
| --- | --- | --- |
| GET | `/admin/overview` | `orders.read` |
| GET | `/admin/orders` | `orders.read` |
| PATCH | `/admin/orders/:id/status` | `orders.update` |
| GET | `/admin/kitchen` | `orders.read` |
| GET, POST | `/admin/products` | `products.read` / `products.create` |
| PATCH | `/admin/products/:id` | `products.update` |
| POST | `/admin/media/upload` | `media.manage` |
| GET, PATCH | `/admin/customers`, `/admin/customers/:id` | `customers.read` / `customers.manage` |
| GET, POST, PATCH | `/admin/staff`, `/admin/staff/:id` | Staff roles and monthly salaries (`staff.manage`) |
| POST | `/admin/staff/:id/fund` | Super Admin funding with a compulsory memo |
| GET, PUT | `/admin/payroll-settings` | Super Admin salary-source switch; defaults to prefunded capital |
| GET, POST | `/admin/inventory` | `inventory.read` / `inventory.manage` |

Order transitions are validated against the current state and fulfilment type. Every accepted transition creates history, relevant fulfilment timestamps, an in-app customer notification, and an audit record.

## Owner withdrawals

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/owner/wallet` | Ledger balance, reservations and withdrawal history |
| GET | `/owner/banks` | Strowallet bank list |
| POST | `/owner/account-name` | Strowallet account-name enquiry |
| POST | `/owner/withdrawals` | Submit an eligible month-end request |
| GET | `/admin/withdrawals` | Finance review queue |
| POST | `/admin/withdrawals/:id/approve` | Independent approval/rejection |
| POST | `/admin/withdrawals/:id/process` | Initialize an approved Strowallet transfer |
| POST | `/payouts/webhooks/strowallet` | Record callback and independently verify transfer |

Owners and staff use the same bank-list, account-enquiry and withdrawal endpoints under `/staff/banks`, `/staff/account-name` and `/staff/withdrawals`; the authenticated role selects the appropriate ledger and eligibility rules. The former `/owner/*` transfer routes remain available for backward compatibility. `/staff/wallet` returns staff available, reserved and next-unearned salary balances plus transaction and withdrawal histories. The transfer webhook does not directly change wallet balances. It triggers Strowallet’s verification endpoint, then posts an idempotent debit or reversal credit based on the verified result.

## Marketing and growth

| Method | Path | Purpose |
| --- | --- | --- |
| GET, POST | `/admin/coupons` | List and create backend-validated coupons |
| PATCH | `/admin/coupons/:id` | Activate or deactivate a coupon |
| GET, PATCH | `/admin/referrals` | Referral analytics and bilateral reward rules |
| GET, POST | `/admin/campaigns` | Campaign publishing controls |
| GET | `/customers/me/referrals` | Customer referral code, link and activity |
| GET | `/customers/me/rewards` | Crave Credit balance and immutable history |

Checkout quote and checkout creation accept `couponCode` and `useCredits`. Crave Credit applies only to food value, never delivery fees, and is reserved atomically before payment. Both referral participants receive credit only after the qualifying first paid order is fulfilled and its configured verification delay has elapsed.
# Phase 5 accounting and reporting

- `GET /api/v1/admin/accounting/overview`
- `GET|POST /api/v1/admin/accounting/expenses`
- `POST /api/v1/admin/accounting/expenses/:id/approval`
- `POST /api/v1/admin/accounting/receipts/upload`
- `GET|PATCH /api/v1/admin/accounting/periods`
- `POST /api/v1/admin/accounting/journals/:id/reverse`
- `GET|POST /api/v1/admin/accounting/settlements`
- `GET|POST|PATCH /api/v1/admin/accounting/refunds`
- `GET /api/v1/admin/reports/finance`
- `GET /api/v1/admin/reports/finance/export?format=csv|pdf`

# Phase 6 owners and profit sharing

- `GET|POST /api/v1/admin/owners`
- `PATCH /api/v1/admin/owners/:id`
- `POST /api/v1/admin/owners/:id/ownership`
- `PATCH /api/v1/admin/owners/:id/permissions`
- `GET /api/v1/admin/profit`
- `POST /api/v1/admin/profit/calculate`
- `POST /api/v1/admin/profit/:id/approve`
- `POST /api/v1/admin/profit/:id/post`
- `POST /api/v1/admin/profit/:id/reverse`
- `PATCH /api/v1/admin/profit/allocations/:id`
- `GET /api/v1/owner/dashboard`
