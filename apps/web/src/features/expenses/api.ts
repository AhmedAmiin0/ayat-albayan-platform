import {
  localizedName,
  type ExpenseCategoryView,
  type ExpenseView,
  type ExpenseYearView,
  type PaymentMethod,
  type SignedDownload,
  type SignedUpload,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { supabase } from '@/lib/http/supabase';
import { MONEY_KEY } from '@/features/subscriptions/api';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';

// apps/api/src/modules/expenses (docs/11 §9 + §13, R-RPT-02, issue E4).
export type { ExpenseCategoryView, ExpenseView, ExpenseYearView } from '@ab/shared';

export const expensesQuery = (month: string) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'expenses', month],
    queryFn: () => apiFetch<ExpenseView[]>(`/expenses?month=${month}`),
  });

export const expenseYearQuery = (year: string) =>
  queryOptions({
    queryKey: [...MONEY_KEY, 'expenses', 'year', year],
    queryFn: () => apiFetch<ExpenseYearView>(`/expenses/year?year=${year}`),
  });

export const categoriesQuery = queryOptions({
  queryKey: [...MONEY_KEY, 'expense-categories'],
  queryFn: () => apiFetch<ExpenseCategoryView[]>('/expense-categories'),
  staleTime: 10 * 60_000,
});

export const addCategory = (body: { key: string; labelAr: string }) => apiSend<ExpenseCategoryView>('POST', '/expense-categories', body);

/**
 * The table's label in the UI language (English UI: label_en, else the seeded English word, else
 * the Arabic label); a key missing from the table: the seeded word, else the key itself.
 */
export function categoryLabel(categories: readonly ExpenseCategoryView[] | undefined, key: string): string {
  const seeded = (t.enums.expenseCategory as Record<string, string | undefined>)[key];
  const row = categories?.find((c) => c.key === key);
  if (!row) return seeded ?? key;
  return localizedName({ ar: row.label_ar, en: row.label_en?.trim() || seeded }, locale);
}

export type ExpenseBody = {
  month: string;
  category: string;
  amount: number;
  currency: string;
  paidOn: string | null;
  vendor: string | null;
  method: PaymentMethod | null;
  receiptPath?: string | null;
  recurring: boolean;
  note: string | null;
};

export const saveExpense = ({ id, body }: { id: string | null; body: ExpenseBody }) =>
  id ? apiSend<ExpenseView>('PATCH', `/expenses/${id}`, body) : apiSend<ExpenseView>('POST', '/expenses', body);

/** A recurring draft becomes a real expense of its month. */
export const confirmDraft = (id: string) => apiSend<ExpenseView>('PATCH', `/expenses/${id}`, { isDraft: false });

export const deleteExpense = (id: string) => apiSend('DELETE', `/expenses/${id}`);

export const expenseReceiptUrl = (id: string) => apiFetch<SignedDownload>(`/expenses/${id}/receipt`);

/** Straight to receipts/expenses/… through a one-off signed URL; the path is then saved with the expense. */
export async function uploadExpenseReceipt(file: File): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/expenses/receipt-upload-url', { mime: file.type, size: file.size });
  const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return signed.path;
}

/** One total per currency (amounts are never mixed or converted here); drafts are not counted. */
export function totalsByCurrency(rows: readonly Pick<ExpenseView, 'amount' | 'currency' | 'is_draft'>[]): [string, number][] {
  const sums = new Map<string, number>();
  for (const r of rows) if (!r.is_draft) sums.set(r.currency, Math.round(((sums.get(r.currency) ?? 0) + r.amount) * 100) / 100);
  return [...sums.entries()].sort(([a], [b]) => a.localeCompare(b));
}
