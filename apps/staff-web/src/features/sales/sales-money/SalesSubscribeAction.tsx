import type { SalesFamilyStudent, StudentStatus } from '@ab/shared';

// The sales chat's money actions (owner 2026-10-12, R-ASST-01/04): only in sales mode, only on a
// family's chat, and only for the students she brought (GET /sales/money/family). Their state and
// buttons live in useSalesFamilyActions (W3: one visible «اشتراك جديد», the rest in «المزيد»).

/** Statuses that hold a subscription to follow (owner 2026-10-18). */
const COURSE_STATUSES: ReadonlySet<StudentStatus> = new Set(['pending_subscription', 'active', 'pending_renewal']);

/**
 * Who gets «أيام الحلقات»: a student with a subscription to follow, by status or by an open
 * (unpaid or partly paid) package of hers, e.g. a new, trial or expired student just sold one.
 */
export const hasCourse = (s: Pick<SalesFamilyStudent, 'status' | 'open'>): boolean => COURSE_STATUSES.has(s.status) || s.open.length > 0;
