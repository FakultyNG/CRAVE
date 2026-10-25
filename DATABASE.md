# Database architecture

PostgreSQL and Prisma are the system of record. Money is represented in integer kobo. Financial phases will use exact decimal percentages only where ratios cannot be stored as integers.

## Implemented models

- Identity: `User`, `Session`, `OtpChallenge`.
- Access: `StaffProfile`, `Role`, `Permission`, `RolePermission`, `UserPermission`, `Invitation`.
- Catalogue: `Category`, `Product`, `ProductVariant`, `ProductOption`, `ProductMedia`, `ProductAvailability`, `ProductCost`.
- Operations: `Location`, `Notification`, `Setting`, `AuditLog`.
- Ordering: `Address`, `DeliveryZone`, `Cart`, `CartItem`, `CartItemOption`, `Order`, `OrderItem`, `OrderItemOption`, `OrderStatusHistory`, `Favourite`.
- Payments: `PaymentIntent`, `PaymentEvent`, `ProviderWebhook`.
- Operations: `FulfillmentRecord`, `InventoryItem`, `ProductInventory`, `StockMovement`, `Supplier`.
- Owner payout rail: `OwnerProfile`, `OwnerLedgerEntry`, `WithdrawalRequest`, `WithdrawalApproval`, `WithdrawalEvent`.

Phone numbers are unique E.164 values. Session and invitation secrets are stored as hashes. Product costs are effective-dated so later price changes cannot alter historical margin calculations.

Order items snapshot names, selected options, selling price and effective production cost at checkout so later catalogue edits cannot rewrite history. Guest cart/order access is tied to a hashed HTTP-only token. Payment intents carry unique merchant/provider references and idempotency keys.

Bank account numbers are encrypted with AES-256-GCM and only their last four digits appear in API responses. Requested, approved and processing withdrawals reserve wallet balance. A verified successful transfer posts one idempotent debit; a verified reversal posts one corresponding credit.

Staff wallets use a separate immutable ledger. `nextSalaryAt` is advanced atomically and each monthly salary has a unique payroll source key, so repeated dashboard requests cannot credit salary twice. Salary entries snapshot `PREFUNDED_CAPITAL` or `GROSS_REVENUE`; only the latter creates an idempotent `GrossRevenueLedgerEntry`. Bonus funding records the compulsory memo in both the wallet entry and audit log.

Phase 4 adds coupons and restriction joins, referral relationships and configurable rules, immutable promotional-credit entries and checkout reservations, plus publishable campaigns. Referral rewards create two uniquely sourced credits. PostgreSQL advisory locks serialize coupon claims and credit reservations during checkout.

## Planned domains

- Phase 3: fulfilment records, refunds, inventory, suppliers and managed media assets.
- Phase 4 delivered: coupons/redemptions, referrals/rewards, promotional credit ledger and campaigns.
- Phase 5: ledger accounts, journal entries/lines, expenses, financial periods, adjustments and profit calculations.
- Phase 6: owners, effective-dated ownership records, immutable profit allocations, owner ledgers, withdrawal requests/approvals and payouts.

Every financial mutation will run in a database transaction with idempotency controls. Closed-period corrections will use reversing entries rather than mutation of posted history.
