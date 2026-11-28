import type { InvoicesUrlSearch } from '@/features/finance/finance/search';

/** A filter that matches nothing keeps the table (its toolbar and chips) on screen. */
export const isBare = (total: number | undefined, search: InvoicesUrlSearch, filters: number) =>
  total === 0 && !search.from && !search.to && filters === 0;

export const filterValuesOf = (search: InvoicesUrlSearch) => ({
  student: search.f_student ?? '',
  kind: search.f_kind ?? '',
});

/** The payment dialog needs the invoice's first student. */
export function paymentOf<S>(paying: { id: string; students: readonly S[] } | null) {
  const student = paying?.students[0];
  if (!paying || !student) return null;
  return { invoiceId: paying.id, student };
}

/** Page 1 leaves the URL without a page. */
export const pageSearch = (p: number) => ({ page: p > 1 ? p : undefined });
