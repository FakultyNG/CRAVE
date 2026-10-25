# CRAVE owners and profit distributions

Phase 6 makes owners first-class users with isolated `/owner` dashboards. An owner accepts access by registering with the phone number created by the Super Admin; OTP and PIN authentication then use the existing 120-hour sliding session.

## Ownership records

- Ownership is stored as effective-dated basis points. One basis point is 0.01%.
- The active total is validated at every affected ownership checkpoint and cannot exceed 100%.
- Any remainder is reported as unallocated. It is never assigned automatically.
- New ownership records cannot be backdated into a closed financial period.
- Ending an ownership interest is a dated 0% record, preserving the prior history.

## Profit distribution

1. Accounting closes a monthly financial period and stores its final P&L snapshot.
2. Finance chooses retained earnings, approved reserves and any reviewed adjustment.
3. Distributable profit is `max(0, net profit - retained earnings - reserve + adjustment)`.
4. Ownership uses either the period-end holding or an explicitly selected daily-weighted policy.
5. If ownership changed during the month, the engine refuses to calculate without an explicit policy.
6. Allocations use integer kobo and deterministic largest-remainder rounding. Unowned profit remains unallocated.
7. A different authorised user must approve the calculation.
8. Posting creates immutable owner-ledger credits and a balanced accounting entry to owner-distributions payable.

Re-running a live calculation returns the same calculation. Rejected or fully reversed calculations create a new numbered revision. Posted distributions can only be corrected through a reasoned reversal, and reversal is blocked when an owner has already spent the balance.

## Holds and withdrawals

An allocation may be held before posting. Held value is shown separately and never enters the withdrawable ledger. A held allocation can later be released through a separately audited posting.

Owners may request withdrawals only on the final calendar day in Africa/Lagos. The owner must be active, phone-verified, have valid bank details confirmed through Strowallet, and have enough previously approved available balance. Pending current-month profit is never withdrawable.

Paid owner withdrawals reduce both the owner ledger and owner-distributions payable. Provider reversals restore both records idempotently.
