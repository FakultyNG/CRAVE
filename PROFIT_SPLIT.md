# Profit split policy

CRAVE Profit Split distributes approved accounting profit to owners. It never distributes gross sales and never treats a frontend calculation as authoritative.

## Source and calculation

Only a closed `FinancialPeriod` with an immutable report snapshot can be calculated. The backend starts with period net profit, subtracts retained earnings and reserves, applies approved adjustments, and floors distributable profit at zero. A loss therefore produces no positive owner credit.

Ownership is effective-dated in basis points. Total ownership may not exceed 100%; any unallocated percentage remains an explicit unallocated amount and is never assigned automatically. When ownership changes during a period, the calculator must use either the disclosed period-end policy or weighted-daily policy.

All values are integer kobo. The largest-remainder method allocates deterministic rounding pennies while preserving the unallocated share.

## Controls and states

1. A user with `profit.calculate` creates a calculation preview.
2. A different user with `profit.approve` approves or rejects it.
3. Individual allocations may be held with a reason before posting.
4. Posting creates owner-ledger credits and a balanced accounting journal exactly once.
5. Held allocations are not withdrawable. Releasing a held allocation posts its credit separately.
6. A posted calculation can be reversed only when its owner credits have not been spent; the reversal creates compensating ledger and journal entries rather than deleting history.

Recalculating a rejected or reversed period creates a revision. Approvals, holds, postings, reversals, and ownership changes remain auditable.

## Owner access and withdrawals

Owners see only their own percentage history, pending/available/held amounts, statements, withdrawals, and explicitly granted admin privileges. Pending-period profit is not available cash.

Withdrawals are permitted only from an available owner-ledger balance, on the last calendar day in `Africa/Lagos`, after phone verification and bank-name enquiry. Owner and staff payouts use the same Strowallet bank-list, account-name, bank-transfer, and webhook provider boundary, while retaining separate ledgers and approval records.
