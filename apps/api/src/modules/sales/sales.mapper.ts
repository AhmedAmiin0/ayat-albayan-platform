import { DEFAULT_JOIN_WINDOW, joinWindow, type JoinWindowConfig, type SalesMeetingView, type SalesSubscriptionView } from '@ab/shared';
import { ar } from '../../common/i18n/server-text';
import type { SalesLessonRow } from './schedule/sales-lessons';
import type { SalesSubscriptionRow } from './sales.queries';

/** Pending = still to be confirmed or paid (trial | unpaid | paused); confirmed = active. */
export const KIND_STATUSES = {
  pending: ['trial', 'unpaid', 'paused'],
  confirmed: ['active'],
} as const;

/** A whitelist, not a omit-list: a column added to subscriptions later never reaches a salesperson. */
export function toSalesSubscription(row: SalesSubscriptionRow): SalesSubscriptionView {
  return {
    id: row.id,
    student: { id: row.student?.id ?? '', code: row.student?.code ?? '', name: row.student?.name ?? '' },
    package: row.package,
    status: row.status,
    starts_on: row.starts_on,
    lessons_total: row.lessons_total,
  };
}

/** `win`: the classroom window from settings (default: the registry's 15 / 120 minutes). */
export function toSalesMeeting(row: SalesLessonRow, at: { now: Date; win?: JoinWindowConfig }): SalesMeetingView {
  const { now, win = DEFAULT_JOIN_WINDOW } = at;
  const students = row.lesson_students.flatMap((s) => (s.student ? [s.student.name] : []));
  return {
    lesson_id: row.id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    teacher_name: row.teacher?.display_name_ar ?? null,
    lead_or_student_name: row.rule?.lead?.name ?? (students.join(ar.common.listSeparator) || null),
    joinable_window: joinWindow(row, now, win),
  };
}
