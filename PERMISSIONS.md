# Permissions

Permissions are additive role grants with per-user allow/deny overrides. Navigation visibility is convenience only; server-side guards are authoritative.

Seeded permission keys cover orders, products, media, customers, marketing, coupons, referrals, inventory, accounting, reports, staff, owners, profit calculation/approval, payout request/approval, settings and audit access.

Phase 3 seeds Super Admin, Business Manager, Kitchen Staff, Marketing Manager, Finance Manager, Support Staff and Owner roles with explicit role-permission joins. System roles are presets, not hard-coded authorization branches. Owners receive `/owner` access only when their active identity and role are confirmed.

No staff member may change their own role or status. Staff invitations bind an E.164 phone number to a role and become active only after that same number completes OTP registration. Product changes, media uploads, customer suspensions, order transitions, staff changes, withdrawal approvals and transfer initiation create audit records.

Only a session whose active role is exactly `Super Admin` may add bonus or adjustment funds to a staff wallet, and every such credit requires a memo. Staff can withdraw only earned ledger balance; the displayed next salary remains unavailable until its Lagos month-end due date.

Phase 4 administration uses `marketing.manage`, `coupons.manage` and `referrals.manage`. Coupon validation, referral qualification and promotional-credit spending are enforced server-side.

Owner withdrawals require `payouts.request`; review and transfer execution require `payouts.approve`. The owner cannot approve or process their own request, and an owner request cannot exceed the ledger-backed available balance.
