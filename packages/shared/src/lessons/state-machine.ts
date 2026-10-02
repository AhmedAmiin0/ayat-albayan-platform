import type { LessonStatus } from '../enums/index.js';

// Lesson lifecycle (R-SCH-03, R-SCH-07, R-SCH-08; issue B2). Why each move exists:
// - scheduled («يحتاج تأكيد», docs/01) is where booking and rule generation put every lesson.
// - scheduled → confirmed: R-SCH-03, confirmation by the guardian's reply or a teacher/admin action.
// - scheduled → completed | late | excused | no_show: issue B2, 29 of 30 calendar events were
//   never confirmed even after the lesson happened, so an outcome must not require a confirm first.
// - scheduled | confirmed → cancelled_by_teacher | cancelled_by_admin | rescheduled | excused:
//   R-SCH-07, a single occurrence (or the rest of its rule) can be cancelled or moved. A student's
//   cancellation is `excused` («اعتذر مسبقًا»); there is no cancelled_by_student status.
// - Every other status is terminal: the outcome drives package balance (R-SUB-03) and teacher
//   payouts (R-TCH-04), and a moved lesson lives on as a new row (lessons.rescheduled_from_id).
// - A wrong outcome is fixed through the report, not here: submit_report (migration 131)
//   re-derives the lesson's outcome from its students' attendance, audited (R-REP-03).

const OUTCOMES = ['completed', 'late', 'excused', 'no_show'] as const;
const CLOSERS = ['cancelled_by_teacher', 'cancelled_by_admin', 'rescheduled'] as const;

export const LESSON_TRANSITIONS: Record<LessonStatus, readonly LessonStatus[]> = {
  scheduled: ['confirmed', ...OUTCOMES, ...CLOSERS],
  confirmed: [...OUTCOMES, ...CLOSERS],
  completed: [],
  late: [],
  excused: [],
  no_show: [],
  cancelled_by_teacher: [],
  cancelled_by_admin: [],
  rescheduled: [],
};

/** What a user or job does to a lesson; each event lands on exactly one status. */
export const LESSON_EVENTS = [
  'confirm',
  'complete',
  'mark_late',
  'excuse',
  'mark_no_show',
  'cancel_by_teacher',
  'cancel_by_admin',
  'reschedule',
] as const;
export type LessonEvent = (typeof LESSON_EVENTS)[number];

export const LESSON_EVENT_TARGET: Record<LessonEvent, LessonStatus> = {
  confirm: 'confirmed',
  complete: 'completed',
  mark_late: 'late',
  excuse: 'excused',
  mark_no_show: 'no_show',
  cancel_by_teacher: 'cancelled_by_teacher',
  cancel_by_admin: 'cancelled_by_admin',
  reschedule: 'rescheduled',
};

/** Events accepted by `POST /lessons/:id/status`; the others have their own routes. */
export const STATUS_ROUTE_EVENTS = ['complete', 'mark_late', 'mark_no_show', 'excuse'] as const;
export type StatusRouteEvent = (typeof STATUS_ROUTE_EVENTS)[number];

/** Who cancelled (CancelRequest.by) → status. A student's cancellation is an excuse. */
export const CANCEL_BY = ['teacher', 'admin', 'student'] as const;
export type CancelBy = (typeof CANCEL_BY)[number];
export const CANCEL_STATUS: Record<CancelBy, LessonStatus> = {
  teacher: 'cancelled_by_teacher',
  admin: 'cancelled_by_admin',
  student: 'excused',
};

/** Statuses whose time is taken: a booking over one of these is a conflict (R-SCH-04). */
export const OCCUPYING_LESSON_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'late',
  'no_show',
] as const satisfies readonly LessonStatus[];

/** Not happened and not cancelled yet: the only statuses a confirm/cancel/reschedule can start from. */
export const OPEN_LESSON_STATUSES = [
  'scheduled',
  'confirmed',
] as const satisfies readonly LessonStatus[];

export function canTransitionLesson(from: LessonStatus, to: LessonStatus): boolean {
  return LESSON_TRANSITIONS[from].includes(to);
}

/** The status `event` moves `from` to, or null when the move is not allowed (→ 409). */
export function applyLessonEvent(from: LessonStatus, event: LessonEvent): LessonStatus | null {
  const to = LESSON_EVENT_TARGET[event];
  return canTransitionLesson(from, to) ? to : null;
}

/** Actions to offer for a lesson in `status`, in LESSON_EVENTS order. */
export function allowedLessonEvents(status: LessonStatus): LessonEvent[] {
  return LESSON_EVENTS.filter((e) => applyLessonEvent(status, e) !== null);
}

export function isOpenLesson(status: LessonStatus): boolean {
  return (OPEN_LESSON_STATUSES as readonly LessonStatus[]).includes(status);
}
