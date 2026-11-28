import { scheduleRuleCalls, type BookingMode } from '@ab/client-core';
import type { LessonTimeEdit, TimeEditResult } from '@ab/schedule';
import type {
  CancelRequest,
  Conflict,
  LessonView,
  RescheduleRequest,
  StatusRouteEvent,
  ScheduleOverview,
} from '@ab/schedule';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend, errorCode, t } from '@ab/web-kit';
import { bookingCallsOf } from '@/features/teaching/booking/mode';
import type { Window } from '@ab/web-kit';
import { lessonKeys } from './lesson.keys';

// Phase 2 lesson routes (docs/10 §5). Commands camelCase, responses LessonView rows.

/** Invalidate after any lesson write: the week grid, the teacher dashboard and slot pickers. */
export const LESSONS_KEY = lessonKeys.all;

/**
 * GET /lessons/overview?from&to (≤ 31 days): every teacher with hours, time off, load and free
 * gaps, plus the window's lessons (every status). One request; the filters run on this payload.
 * Under LESSONS_KEY, so every lesson write refreshes the calendar.
 */
export const overviewQuery = (w: Window) => {
  const params = new URLSearchParams({ from: w.from.toISOString(), to: w.to.toISOString() });
  return queryOptions({
    queryKey: lessonKeys.overview(params.toString()),
    queryFn: () => apiFetch<ScheduleOverview>(`/lessons/overview?${params}`),
    placeholderData: keepPreviousData,
  });
};

export interface SlotsParams extends Window {
  teacherId: string;
  durationMin: number;
  studentIds: readonly string[];
  /** This course's lessons are being moved, so they are not busy. */
  excludeCourse?: string | undefined;
  /** The upcoming trial the new date moves, so it is not busy. */
  excludeLessonId?: string | undefined;
  /** The lesson the assistant moves via /sales/booking/slots. */
  lessonId?: string | undefined;
}

/** GET /booking/slots (≤ 14 days; the assistant's mirror under /sales/booking): the candidate
 * starts of the teacher, each with its conflicts. */
export const slotsQuery = (p: SlotsParams, mode: BookingMode = 'admin') => {
  const query = {
    teacherId: p.teacherId,
    from: p.from.toISOString(),
    to: p.to.toISOString(),
    durationMin: p.durationMin,
    studentIds: p.studentIds.length > 0 ? p.studentIds.join(',') : undefined,
    excludeCourse: p.excludeCourse || undefined,
    excludeLessonId: p.excludeLessonId || undefined,
    lessonId: p.lessonId || undefined,
  };
  return queryOptions({
    queryKey: lessonKeys.slots(mode, JSON.stringify(query)),
    queryFn: () => bookingCallsOf[mode].slots(query),
    placeholderData: keepPreviousData,
  });
};

/** POST /schedule-rules/refresh (admin): generate every lesson the weekly rules owe, now. */
export const syncSchedule = () => scheduleRuleCalls({ apiFetch, apiSend }).refresh();

export const confirmLesson = (id: string) => apiSend<LessonView>('POST', `/lessons/${id}/confirm`);

export const setLessonStatus = ({ id, event }: { id: string; event: StatusRouteEvent }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/status`, { event });

export const cancelLesson = ({ id, body }: { id: string; body: CancelRequest }) =>
  apiSend<LessonView[]>('POST', `/lessons/${id}/cancel`, body);

export const rescheduleLesson = ({ id, body }: { id: string; body: RescheduleRequest }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/reschedule`, body);

/** Admin only (R-SCH-11): the same lesson with a new start and length. */
export const editLessonTime = ({ id, body }: { id: string; body: LessonTimeEdit }) =>
  apiSend<TimeEditResult>('PATCH', `/lessons/${id}/time`, body);

/** Pending alternative-time proposals of a teacher or family (R-SCH-08). */
export const proposalsQuery = queryOptions({
  queryKey: lessonKeys.proposals(),
  queryFn: () => apiFetch<LessonView[]>('/lesson-proposals'),
});

/** Approving moves the lesson (a reschedule): 409 conflict unless `override` is given. */
export const approveProposal = ({ id, override }: { id: string; override?: string }) =>
  apiSend<LessonView>(
    'POST',
    `/lesson-proposals/${id}/approve`,
    override ? { override: { reason: override } } : {},
  );

/** `note` is the answer the family reads with a declined request. */
export const rejectProposal = ({ id, note }: { id: string; note?: string }) =>
  apiSend<LessonView>('POST', `/lesson-proposals/${id}/reject`, note ? { note } : {});

export { errorCode };

/** The clashes of a 409 `{ code: 'conflict', conflicts }`, else null. */
export function conflictsOf(error: unknown): Conflict[] | null {
  if (errorCode(error) !== 'conflict' || !(error instanceof ApiError)) return null;
  const body = error.body as { conflicts?: unknown };
  return Array.isArray(body.conflicts) ? (body.conflicts as Conflict[]) : [];
}

// Every lesson/booking domain code (lessons.error.*, booking.error.*), drawer wording on top.
const ERROR_TEXT: Record<string, string> = {
  ...t.booking.error,
  ...t.lessons.error,
  invalid_transition: t.lessons.invalidTransition,
  slot_taken: t.lessons.slotTaken,
  rule_not_active: t.lessons.ruleNotActive,
  not_started: t.lessons.notStarted,
};

/** The line for a failed lesson or booking command (docs/10 §3 codes), else the generic error. */
export function lessonErrorText(error: unknown): string {
  return ERROR_TEXT[errorCode(error) ?? ''] ?? t.common.error;
}
