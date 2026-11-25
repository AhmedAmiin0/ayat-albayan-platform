import type { SalesFamilyStudent } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';

// Only in sales mode, on a family's chat, for students she brought (R-ASST-01/04).

/** Statuses that hold a subscription to follow. */
const COURSE_STATUSES: ReadonlySet<StudentStatus> = new Set(['pending_subscription', 'active', 'pending_renewal']);

/** A student with a subscription to follow by status, or by an open unpaid package of hers. */
export const hasCourse = (s: Pick<SalesFamilyStudent, 'status' | 'open'>): boolean => COURSE_STATUSES.has(s.status) || s.open.length > 0;
