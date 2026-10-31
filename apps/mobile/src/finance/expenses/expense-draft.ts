import { RIYADH_TZ, amountProblem, parseAmount, type ExpenseCreate } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { paidAtFor } from '@/payments/lib/paid-day';
import type { Receipt } from '@/payments/receipt';
import { localDate } from '@/today/lib/timeline';

/** What the admin entered in «مصروف جديد». The tracker is in EGP (web: the default currency). */
export interface ExpenseDraft {
  category: string;
  amountText: string;
  /** Days back on the Riyadh calendar; 0 = today. */
  daysAgo: number;
  vendor: string;
  /** A manual method only (`card` is recorded by the platform, never entered). */
  method: NonNullable<ExpenseCreate['method']> | null;
  note: string;
  receipt: Receipt | null;
}

export const emptyExpense = (): ExpenseDraft => ({ category: '', amountText: '', daysAgo: 0, vendor: '', method: null, note: '', receipt: null });

interface ExpenseCheck {
  errors: { category?: string; amount?: string };
  ok: boolean;
}

/** The refusals before anything is sent; the API checks the same (expenseCreateSchema). */
export function checkExpense(draft: ExpenseDraft): ExpenseCheck {
  const errors: ExpenseCheck['errors'] = {};
  if (!draft.category) errors.category = t.mobileFinance.expenses.categoryRequired;
  const problem = amountProblem({ amount: parseAmount(draft.amountText), text: draft.amountText, ceiling: Number.POSITIVE_INFINITY });
  if (problem === 'required') errors.amount = t.common.required;
  else if (problem) errors.amount = t.payments.mobile.amountInvalid;
  return { errors, ok: Object.keys(errors).length === 0 };
}

/** POST /expenses: the paid day decides the accounting month (no month is sent). */
export function expenseBody(draft: ExpenseDraft, receiptPath: string | null, now: Date): ExpenseCreate {
  return {
    category: draft.category,
    amount: parseAmount(draft.amountText) ?? 0,
    currency: 'EGP',
    // academy day (docs/34 b): an expense is booked on an academy day.
    paidOn: localDate(paidAtFor(now, draft.daysAgo), RIYADH_TZ),
    vendor: draft.vendor.trim() || null,
    method: draft.method,
    receiptPath,
    note: draft.note.trim() || null,
  };
}
