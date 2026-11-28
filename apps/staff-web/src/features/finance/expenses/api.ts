import { expenseCalls, expenseCategoryCalls } from '@ab/client-core';
import { localizedName, round2 } from '@ab/core';
import {
  expenseReceiptUploadSchema,
  type ExpenseCategoryView,
  type ExpenseCreateInput,
  type ExpenseView,
} from '@ab/money';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, t, locale } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { moneyKeys } from '@/features/finance/keys';

// apps/api/src/modules/expenses (docs/11 §9 + §13, R-RPT-02, issue E4).
export type { ExpenseCategoryView, ExpenseView, ExpenseYearView } from '@ab/money';

const calls = expenseCalls({ apiFetch, apiSend });
const categoryCalls = expenseCategoryCalls({ apiFetch, apiSend });

export const expensesQuery = (month: string) =>
  queryOptions({
    queryKey: moneyKeys.expenses(month),
    queryFn: () => calls.list({ month }),
  });

export const expenseYearQuery = (year: string) =>
  queryOptions({
    queryKey: moneyKeys.expenseYear(year),
    queryFn: () => calls.year(year),
  });

export const categoriesQuery = queryOptions({
  queryKey: moneyKeys.expenseCategories(),
  queryFn: categoryCalls.list,
  staleTime: 10 * 60_000,
});

export const addCategory = categoryCalls.add;

/**
 * The table's label in the UI language (English UI: label_en, else the seeded English word, else
 * the Arabic label); a key missing from the table: the seeded word, else the key itself.
 */
export function categoryLabel(
  categories: readonly ExpenseCategoryView[] | undefined,
  key: string,
): string {
  const seeded = (t.enums.expenseCategory as Record<string, string | undefined>)[key];
  const row = categories?.find((c) => c.key === key);
  if (!row) return seeded ?? key;
  return localizedName({ ar: row.label_ar, en: row.label_en?.trim() || seeded }, locale);
}

export type ExpenseBody = ExpenseCreateInput;

export const saveExpense = ({ id, body }: { id: string | null; body: ExpenseBody }) =>
  id ? calls.update(id, body) : calls.create(body);

/** A recurring draft becomes a real expense of its month. */
export const confirmDraft = (id: string) => calls.update(id, { isDraft: false });

export const deleteExpense = calls.remove;

export const expenseReceiptUrl = calls.receipt;

/** To receipts/expenses/… through a one-off signed URL; the path is then saved with the expense. */
export async function uploadExpenseReceipt(file: File): Promise<string> {
  const slot = expenseReceiptUploadSchema.parse({ mime: file.type, size: file.size });
  const signed = await calls.receiptUploadUrl(slot);
  const { error } = await uploadSigned(signed, { body: file, contentType: file.type });
  if (error) throw error;
  return signed.path;
}

/** One total per currency (amounts are never mixed or converted here); drafts are not counted. */
export function totalsByCurrency(
  rows: readonly Pick<ExpenseView, 'amount' | 'currency' | 'is_draft'>[],
): [string, number][] {
  const sums = new Map<string, number>();
  for (const r of rows)
    if (!r.is_draft) sums.set(r.currency, round2((sums.get(r.currency) ?? 0) + r.amount));
  return [...sums.entries()].sort(([a], [b]) => a.localeCompare(b));
}
