import type { TablesInsert, TablesUpdate } from '@ab/db';
import { monthStart, type ExpenseCreate, type ExpenseUpdate } from '@ab/shared';

// Expense commands → rows (pure). The accounting month is the one sent, else the paid day's month.

export function expenseInsert(input: ExpenseCreate, actorId: string): TablesInsert<'expenses'> {
  const month = input.month ?? (input.paidOn ?? '').slice(0, 7);
  return {
    month: monthStart(month),
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    paid_on: input.paidOn ?? null,
    vendor: input.vendor?.trim() || null,
    method: input.method ?? null,
    receipt_path: input.receiptPath ?? null,
    recurring: input.recurring ?? false,
    note: input.note ?? null,
    created_by: actorId,
  };
}

const COPY = [
  ['category', 'category'],
  ['amount', 'amount'],
  ['currency', 'currency'],
  ['paidOn', 'paid_on'],
  ['method', 'method'],
  ['receiptPath', 'receipt_path'],
  ['recurring', 'recurring'],
  ['isDraft', 'is_draft'],
  ['note', 'note'],
] as const;

/** Only the sent fields; `vendor` is trimmed ('' → null); a paid day moves the month unless one is sent. */
export function expensePatch(patch: Partial<ExpenseUpdate>): TablesUpdate<'expenses'> {
  const write: Record<string, unknown> = {};
  for (const [from, to] of COPY) if (patch[from] !== undefined) write[to] = patch[from];
  if (patch.vendor !== undefined) write['vendor'] = patch.vendor?.trim() || null;
  if (patch.month !== undefined) write['month'] = monthStart(patch.month);
  else if (patch.paidOn) write['month'] = monthStart(patch.paidOn.slice(0, 7));
  return write as TablesUpdate<'expenses'>;
}
