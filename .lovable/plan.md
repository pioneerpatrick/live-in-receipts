

## Fix: Show How Late Overdue Payments Are

### Problem
All clients without a `next_payment_date` are displayed as "Due Today" indefinitely. Clients whose database `status` is "overdue" should reflect that, and ideally show how long they've been overdue based on available date information.

### Solution
Update the `getReminders` logic in `src/components/PaymentReminders.tsx` to:

1. **Use `sale_date` or `created_at` as fallback** -- When no `next_payment_date` exists, calculate overdue duration from when the client was created or their sale date, using installment period to estimate when payment should have started.

2. **Respect the database `status` field** -- If a client's database status is already "overdue", display them as overdue (not "due today"), even when no due date is set.

3. **Improve the time display for overdue items** -- Show a clear "X days/months late" label instead of just "Today" or "Overdue."

### Technical Changes

**File: `src/components/PaymentReminders.tsx`**

- **Lines 360-396 (getReminders mapping logic):**
  - When `next_payment_date` is null, check the client's database `status` field.
  - If `status === 'overdue'`, estimate lateness from `sale_date` or `created_at` date, and set the reminder status to `'overdue'` instead of `'due-today'`.
  - If `status` is not overdue and no date is set, keep as "due-today" (payment date needs to be set).

- **Lines 28-45 (formatTimeDifference function):**
  - Add a case for clients where we know they're overdue but don't have an exact date -- display "Overdue (no due date)" so it's clear they need attention without a misleading "Today" label.

- **Lines 420-447 (getStatusStyles):**
  - No changes needed; existing styles already cover overdue, due-today, and upcoming.

### Result
- Overdue clients will show "X days overdue" or "X months overdue" based on their due date.
- Clients marked overdue in the database but without a due date will show as "Overdue" instead of "Due Today."
- Clients with a balance but no due date and not marked overdue will show "No due date set" to prompt the admin to add one.

