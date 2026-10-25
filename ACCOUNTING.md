# CRAVE accounting module

Phase 5 adds an auditable double-entry subledger in integer kobo. Operational records remain the source events; financial reports read posted journal lines.

## Recognition rules

- Order creation is operational only and does not recognise revenue.
- A verified successful payment posts payment-provider clearing and any Crave Credit used against food, delivery and coupon accounts.
- Estimated cost of goods sold uses the immutable `OrderItem.productionCostKobo` snapshot. Later product-cost changes never rewrite historical margin.
- Provider settlement moves the gross amount out of payment clearing, records the bank net and posts the processing fee separately.
- A paid refund posts sales returns against bank cash. Full refunds also mark the order and paid payment intent refunded.
- Approved ordinary expenses post to their configured expense account, or inventory for ingredient purchases, with the other side in bank or accounts payable.
- Inventory purchases are capitalised. Order cost snapshots post consumption to cost of goods sold, preventing purchase and consumption from being counted twice as expense.
- Gross-revenue-funded salaries post salary expense and payroll payable. Prefunded-capital salaries are labelled separately and are not debited from gross revenue or included as salary expense by the operational sync.
- Approved owner profit distributions post against equity and owner-distributions payable; they never split gross revenue or change the closed period P&L.
- Paid owner withdrawals reduce owner-distributions payable and bank. Provider reversals restore both sides.

## Chart of accounts

System accounts are seeded and also repaired idempotently before posting. Account codes cover provider clearing, bank, inventory, payables, promotional-credit liability, payroll, capital, sales, delivery revenue, discounts, returns, cost of goods sold, operating expense categories, processing fees, and taxes/other charges.

## Controls

- Every posted journal must have equal positive debit and credit totals.
- `sourceType + sourceId` is unique, making operational posting idempotent.
- Monthly periods use Africa/Lagos boundaries and move in order: `DRAFT -> REVIEW -> APPROVED -> CLOSED`.
- A period cannot close with unbalanced entries or expenses awaiting approval.
- Closed periods cannot receive new dated entries. Corrections use a reasoned reversal in an open period.
- Expense and refund creators cannot approve their own submissions.
- Creation, approval, rejection, settlement, refund, reversal and period transitions write audit records.

## Reports and exports

Reports expose gross sales, discounts, returns, net sales, cost of goods sold, gross profit, operating expenses, operating profit, other charges and net profit. They also show created/paid/unpaid orders, provider and payment status, refunds, settlements and processing fees, salary funding source, and revenue by product, category and location.

CSV exports preserve exact kobo values. PDF exports display formatted NGN values and state whether the selected range contains estimated open periods or finalised closed periods.
