import type { LessonView, RescheduleRequest, SlotsResponse } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, riyadhMidnight } from '@/calendar/week';
import { apiFetch, apiSend, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

export interface RescheduleSlotsParams {
  teacherId: string;
  durationMin: number;
  /** The lesson's students: their other lessons count as clashes. */
  studentIds: readonly string[];
  /** The window (slotWindow): one Riyadh week, never in the past. */
  from: string;
  to: string;
}

/**
 * The picker's window: the Riyadh week starting `week` (a Saturday), from now when it is this
 * week. GET /booking/slots caps a window at 14 days; a week is 7.
 */
export function slotWindow(week: string, now: Date): { from: string; to: string } {
  const start = riyadhMidnight(week);
  return {
    from: start > now.toISOString() ? start : now.toISOString(),
    to: riyadhMidnight(addDays(week, 7)),
  };
}

/**
 * GET /booking/slots (docs/10 route 13) for one week: the teacher's candidate starts with their
 * clashes, the lesson's own students included. The lesson being moved is not excluded, so its
 * current time shows busy, which it is.
 */
export function useRescheduleSlots(p: RescheduleSlotsParams) {
  const params = {
    teacherId: p.teacherId,
    from: p.from,
    to: p.to,
    durationMin: p.durationMin,
    studentIds: p.studentIds.join(','),
  };
  return useQuery({
    queryKey: [...pathKey('/booking/slots'), params],
    queryFn: () => apiFetch<SlotsResponse>(`/booking/slots${toQueryString(params)}`),
  });
}

/**
 * POST /lessons/:id/reschedule. On success every lesson list (Today, the calendars) refetches:
 * the old lesson closes as «اتغير ميعادها» and the new one waits for the guardian's confirmation,
 * which the API has already queued on WhatsApp.
 */
export function useReschedule(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RescheduleRequest) =>
      apiSend<LessonView>('POST', `/lessons/${lessonId}/reschedule`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: pathKey('/lessons') }),
  });
}
