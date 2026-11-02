import type { ListSort, PAYMENT_SORT_KEYS, PaymentKind, PaymentMethod } from '@ab/shared';
import type { SortSpec } from '@/common/db/list-sort';
import type { PageQuery } from '@/common/http/http';

export type PaymentSortKey = (typeof PAYMENT_SORT_KEYS)[number];

export type PaymentFilter = PageQuery &
  ListSort<PaymentSortKey> & {
    subscriptionId?: string;
    studentId?: string;
    /** ISO instants, half-open [from, to). */
    from?: string;
    to?: string;
    method?: PaymentMethod;
    kind?: PaymentKind;
  };

/** Sort keys → payments columns (R-NFR-08); the default is newest paid first. */
export const PAYMENT_SORT: SortSpec<PaymentSortKey> = {
  columns: { paid_at: { column: 'paid_at' }, amount: { column: 'amount' }, method: { column: 'method' } },
  fallback: { column: 'paid_at', ascending: false },
};

type Filterable<Q> = { eq: (c: string, v: string) => Q; gte: (c: string, v: string) => Q; lt: (c: string, v: string) => Q };

/** The list filters, shared by the page and its totals (embedded package for the student filter). */
export function filtered<Q extends Filterable<Q>>(q: Q, f: PaymentFilter): Q {
  let out = q;
  if (f.subscriptionId) out = out.eq('subscription_id', f.subscriptionId);
  if (f.studentId) out = out.eq('subscription.student_id', f.studentId);
  if (f.from) out = out.gte('paid_at', f.from);
  if (f.to) out = out.lt('paid_at', f.to);
  if (f.method) out = out.eq('method', f.method);
  if (f.kind) out = out.eq('kind', f.kind);
  return out;
}
