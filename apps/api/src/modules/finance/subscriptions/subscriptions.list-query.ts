import type { ListSort, PackageSize, SUBSCRIPTION_SORT_KEYS, SubscriptionStatus } from '@ab/shared';
import type { SortSpec } from '../../../common/list-sort';
import type { PageQuery } from '../../../common/http/http';

type SubSortKey = (typeof SUBSCRIPTION_SORT_KEYS)[number];

export type SubListQuery = PageQuery &
  ListSort<SubSortKey> & {
    status?: SubscriptionStatus;
    studentId?: string;
    paid?: 'partial';
    /** Part of the student's name. */
    student?: string;
    package?: PackageSize;
  };

export const SELECT = '*, student:students(id, code, name)';

/** Sort keys → columns (R-NFR-08); a custom count (no package) sorts last. Default: newest first. */
export const SUB_SORT: SortSpec<SubSortKey> = {
  columns: {
    created_at: { column: 'created_at' },
    package: { column: 'package', nullsFirst: false },
    price: { column: 'price' },
    status: { column: 'status' },
  },
  fallback: { column: 'created_at', ascending: false },
};

/**
 * The list's select: an inner embed keeps only the rows whose embedded match — the student for
 * the name filter, a payment for «مدفوع جزئيًا» (that extra field is unused).
 */
export function listSelect(q: Pick<SubListQuery, 'student' | 'paid'>): typeof SELECT {
  const student = q.student === undefined ? 'student:students' : 'student:students!inner';
  const paid = q.paid === 'partial' ? ', paid_rows:payments!inner(id)' : '';
  return `*, ${student}(id, code, name)${paid}` as typeof SELECT;
}
