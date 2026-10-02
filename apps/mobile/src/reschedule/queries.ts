import type { LessonView, RescheduleRequest, SlotsResponse } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

const DAY = 86_400_000;
/** GET /booking/slots caps a window at 14 days. */
export const SLOT_DAYS = 14;

export interface RescheduleSlotsParams {
  teacherId: string;
  durationMin: number;
  /** The lesson's students: their other lessons count as clashes. */
  studentIds: readonly string[];
  now: Date;
}

/**
 * GET /booking/slots (docs/10 route 13) for the next 14 days: the teacher's candidate starts with
 * their clashes, the lesson's own students included. The lesson being moved is not excluded, so
 * its current time shows busy, which it is.
 */
export function useRescheduleSlots(p: RescheduleSlotsParams) {
  const params = {
    teacherId: p.teacherId,
    from: p.now.toISOString(),
    to: new Date(p.now.getTime() + SLOT_DAYS * DAY).toISOString(),
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
