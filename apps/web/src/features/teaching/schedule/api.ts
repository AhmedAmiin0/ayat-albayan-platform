import type { CancelRequest, Conflict, LessonView, RescheduleRequest, SlotsResponse, StatusRouteEvent, ScheduleOverview } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { bookingBase, type BookingMode } from '@/features/teaching/booking/mode';
import { t } from '@/lib/i18n/i18n';
import type { LessonTimeEdit, TimeEditResult } from './edit-time/edit-time.contract';

// Phase 2 lesson routes (docs/10 §5). Commands camelCase, responses LessonView rows.

/** Invalidate after any lesson write: the week grid, the teacher dashboard and slot pickers. */
export const LESSONS_KEY = ['lessons'] as const;

export interface Window {
  from: Date;
  to: Date;
}

/**
 * GET /lessons/overview?from&to (≤ 31 days): every teacher with hours, time off, load and free
 * gaps, plus the window's lessons (every status). One request; the filters run on this payload.
 * Under LESSONS_KEY, so every lesson write refreshes the calendar.
 */
export const overviewQuery = (w: Window) => {
  const params = new URLSearchParams({ from: w.from.toISOString(), to: w.to.toISOString() });
  return queryOptions({
    queryKey: [...LESSONS_KEY, 'overview', params.toString()],
    queryFn: () => apiFetch<ScheduleOverview>(`/lessons/overview?${params}`),
    placeholderData: keepPreviousData,
  });
};

export interface SlotsParams extends Window {
  teacherId: string;
  durationMin: number;
  studentIds: readonly string[];
  /** «تغيير أيام الحلقات»: this course's lessons (subscription id) are moving, so they are not busy. */
  excludeCourse?: string | undefined;
  /** «موعد تجريبي جديد»: the upcoming trial the new date moves, so it is not busy. */
  excludeLessonId?: string | undefined;
}

/** GET /booking/slots (≤ 14 days; the assistant's mirror under /sales/booking): the teacher's candidate starts, each with its conflicts. */
export const slotsQuery = (p: SlotsParams, mode: BookingMode = 'admin') => {
  const params = new URLSearchParams({
    teacherId: p.teacherId,
    from: p.from.toISOString(),
    to: p.to.toISOString(),
    durationMin: String(p.durationMin),
  });
  if (p.studentIds.length > 0) params.set('studentIds', p.studentIds.join(','));
  if (p.excludeCourse) params.set('excludeCourse', p.excludeCourse);
  if (p.excludeLessonId) params.set('excludeLessonId', p.excludeLessonId);
  return queryOptions({
    queryKey: [...LESSONS_KEY, 'slots', mode, params.toString()],
    queryFn: () => apiFetch<SlotsResponse>(`${bookingBase(mode)}/slots?${params}`),
    placeholderData: keepPreviousData,
  });
};

/** POST /schedule-rules/refresh (admin): generate every lesson the weekly rules owe, now. */
export const syncSchedule = () =>
  apiSend<{ rules: number; inserted: number; failed: number; ended: number }>('POST', '/schedule-rules/refresh');

export const confirmLesson = (id: string) => apiSend<LessonView>('POST', `/lessons/${id}/confirm`);

export const setLessonStatus = ({ id, event }: { id: string; event: StatusRouteEvent }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/status`, { event });

export const cancelLesson = ({ id, body }: { id: string; body: CancelRequest }) =>
  apiSend<LessonView[]>('POST', `/lessons/${id}/cancel`, body);

export const rescheduleLesson = ({ id, body }: { id: string; body: RescheduleRequest }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/reschedule`, body);

/** PATCH /lessons/:id/time «عدّل الوقت» (R-SCH-11): the same lesson, new start and length. Admin only. */
export const editLessonTime = ({ id, body }: { id: string; body: LessonTimeEdit }) =>
  apiSend<TimeEditResult>('PATCH', `/lessons/${id}/time`, body);

/** GET /lesson-proposals —lessons with a teacher's pending «اقترح ميعاد تاني» (R-SCH-08). */
export const proposalsQuery = queryOptions({
  queryKey: [...LESSONS_KEY, 'proposals'],
  queryFn: () => apiFetch<LessonView[]>('/lesson-proposals'),
});

/** Approving moves the lesson (a reschedule): 409 conflict unless `override` is given. */
export const approveProposal = ({ id, override }: { id: string; override?: string }) =>
  apiSend<LessonView>('POST', `/lesson-proposals/${id}/approve`, override ? { override: { reason: override } } : {});

export const rejectProposal = (id: string) => apiSend<LessonView>('POST', `/lesson-proposals/${id}/reject`);

/** Domain error code of an API failure (`{ code }`, docs/10 §3), else null. */
export function errorCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const body = error.body as { code?: unknown } | null;
  return typeof body?.code === 'string' ? body.code : null;
}

/** The clashes of a 409 `{ code: 'conflict', conflicts }`, else null. */
export function conflictsOf(error: unknown): Conflict[] | null {
  if (errorCode(error) !== 'conflict' || !(error instanceof ApiError)) return null;
  const body = error.body as { conflicts?: unknown };
  return Array.isArray(body.conflicts) ? (body.conflicts as Conflict[]) : [];
}

// Every lesson/booking domain code (lessons.error.*, booking.error.*), with the drawer's own wording on top.
const ERROR_TEXT: Record<string, string> = {
  ...t.booking.error,
  ...t.lessons.error,
  invalid_transition: t.lessons.invalidTransition,
  slot_taken: t.lessons.slotTaken,
  rule_not_active: t.lessons.ruleNotActive,
  not_started: t.lessons.notStarted,
};

/** Arabic line for a failed lesson or booking command (docs/10 §3 codes), else the generic error. */
export function lessonErrorText(error: unknown): string {
  return ERROR_TEXT[errorCode(error) ?? ''] ?? t.common.error;
}
