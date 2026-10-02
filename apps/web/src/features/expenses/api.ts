import type { ExpenseCategory, ExpenseView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { MONEY_KEY } from '@/features/subscriptions/api';

// apps/api/src/modules/expenses (docs/11 §9, R-RPT-02, issue E4).
export type { ExpenseView } from '@ab/shared';

export const expensesQuery = (month: string) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'expenses', month],
    queryFn: () => apiFetch<ExpenseView[]>(`/expenses?month=${month}`),
  });

export type ExpenseBody = {
  month: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  note: string | null;
};

export const saveExpense = ({ id, body }: { id: string | null; body: ExpenseBody }) =>
  id ? apiSend<ExpenseView>('PATCH', `/expenses/${id}`, body) : apiSend<ExpenseView>('POST', '/expenses', body);

export const deleteExpense = (id: string) => apiSend('DELETE', `/expenses/${id}`);

/** One total per currency (amounts are never mixed or converted here). */
export function totalsByCurrency(rows: readonly Pick<ExpenseView, 'amount' | 'currency'>[]): [string, number][] {
  const sums = new Map<string, number>();
  for (const r of rows) sums.set(r.currency, Math.round(((sums.get(r.currency) ?? 0) + r.amount) * 100) / 100);
  return [...sums.entries()].sort(([a], [b]) => a.localeCompare(b));
}
