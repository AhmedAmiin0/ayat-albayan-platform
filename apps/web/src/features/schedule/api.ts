import type {
  CancelRequest,
  Conflict,
  LessonView,
  RescheduleRequest,
  SlotsResponse,
  StatusRouteEvent,
} from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';

// Phase 2 lesson routes (docs/10 §5). Commands camelCase, responses LessonView rows.

/** Invalidate after any lesson write: the week grid, the teacher dashboard and slot pickers. */
export const LESSONS_KEY = ['lessons'] as const;

export interface Window {
  from: Date;
  to: Date;
}

/** GET /lessons?from&to&teacherId — every status, the window is the page (≤ 31 days). */
export const lessonsQuery = (w: Window & { teacherId?: string | undefined }) => {
  const params = new URLSearchParams({ from: w.from.toISOString(), to: w.to.toISOString() });
  if (w.teacherId) params.set('teacherId', w.teacherId);
  return queryOptions({
    queryKey: [...LESSONS_KEY, 'list', params.toString()],
    queryFn: () => apiFetch<LessonView[]>(`/lessons?${params}`),
    placeholderData: keepPreviousData,
  });
};

export interface SlotsParams extends Window {
  teacherId: string;
  durationMin: number;
  studentIds: readonly string[];
}

/** GET /booking/slots (≤ 14 days): the teacher's candidate starts, each with its conflicts. */
export const slotsQuery = (p: SlotsParams) => {
  const params = new URLSearchParams({
    teacherId: p.teacherId,
    from: p.from.toISOString(),
    to: p.to.toISOString(),
    durationMin: String(p.durationMin),
  });
  if (p.studentIds.length > 0) params.set('studentIds', p.studentIds.join(','));
  return queryOptions({
    queryKey: [...LESSONS_KEY, 'slots', params.toString()],
    queryFn: () => apiFetch<SlotsResponse>(`/booking/slots?${params}`),
    placeholderData: keepPreviousData,
  });
};

export const confirmLesson = (id: string) => apiSend<LessonView>('POST', `/lessons/${id}/confirm`);

export const setLessonStatus = ({ id, event }: { id: string; event: StatusRouteEvent }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/status`, { event });

export const cancelLesson = ({ id, body }: { id: string; body: CancelRequest }) =>
  apiSend<LessonView[]>('POST', `/lessons/${id}/cancel`, body);

export const rescheduleLesson = ({ id, body }: { id: string; body: RescheduleRequest }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/reschedule`, body);

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

const ERROR_TEXT: Record<string, string> = {
  invalid_transition: t.lessons.invalidTransition,
  slot_taken: t.lessons.slotTaken,
  rule_not_active: t.lessons.ruleNotActive,
  not_started: t.lessons.notStarted,
};

/** Arabic line for a failed lesson command (docs/10 §3 codes), else the generic error. */
export function lessonErrorText(error: unknown): string {
  return ERROR_TEXT[errorCode(error) ?? ''] ?? t.common.error;
}
