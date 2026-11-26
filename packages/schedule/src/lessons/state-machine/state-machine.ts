import { lessonStatusSchema, type LessonStatus } from '@ab/catalog';
import { z } from 'zod';

// Lifecycle (R-SCH-03/07/08, issue B2): an outcome needs no prior confirm; others are terminal.

const OUTCOMES = ['completed', 'late', 'excused', 'no_show'] as const;
/** Cancelled by the teacher or the admin (a student's cancellation is `excused`). */
export const CANCELLED_LESSON_STATUSES = [
  'cancelled_by_teacher',
  'cancelled_by_admin',
] as const satisfies readonly LessonStatus[];
/** Will not happen at this time: cancelled, or moved to a new row. */
export const CLOSED_LESSON_STATUSES = [
  ...CANCELLED_LESSON_STATUSES,
  'rescheduled',
] as const satisfies readonly LessonStatus[];

export const LESSON_TRANSITIONS: Record<LessonStatus, readonly LessonStatus[]> = {
  scheduled: ['confirmed', ...OUTCOMES, ...CLOSED_LESSON_STATUSES],
  confirmed: [...OUTCOMES, ...CLOSED_LESSON_STATUSES],
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
export const lessonEventSchema = z.enum(LESSON_EVENTS);
export type LessonEvent = z.infer<typeof lessonEventSchema>;

export const LESSON_EVENT_TARGET = z.record(lessonEventSchema, lessonStatusSchema).readonly().decode({
  confirm: 'confirmed',
  complete: 'completed',
  mark_late: 'late',
  excuse: 'excused',
  mark_no_show: 'no_show',
  cancel_by_teacher: 'cancelled_by_teacher',
  cancel_by_admin: 'cancelled_by_admin',
  reschedule: 'rescheduled',
});

/** Events accepted by `POST /lessons/:id/status`; the others have their own routes. */
export const STATUS_ROUTE_EVENTS = ['complete', 'mark_late', 'mark_no_show', 'excuse'] as const;
export const statusRouteEventSchema = z.enum(STATUS_ROUTE_EVENTS);
export type StatusRouteEvent = z.infer<typeof statusRouteEventSchema>;

/** Who cancelled (CancelRequest.by) → status. A student's cancellation is an excuse. */
export const CANCEL_BY = ['teacher', 'admin', 'student'] as const;
export const cancelBySchema = z.enum(CANCEL_BY);
export type CancelBy = z.infer<typeof cancelBySchema>;
export const CANCEL_STATUS = z.record(cancelBySchema, lessonStatusSchema).readonly().decode({
  teacher: 'cancelled_by_teacher',
  admin: 'cancelled_by_admin',
  student: 'excused',
});

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

export function isCancelledLesson(status: string): boolean {
  return (CANCELLED_LESSON_STATUSES as readonly string[]).includes(status);
}

export function isClosedLesson(status: string): boolean {
  return (CLOSED_LESSON_STATUSES as readonly string[]).includes(status);
}
