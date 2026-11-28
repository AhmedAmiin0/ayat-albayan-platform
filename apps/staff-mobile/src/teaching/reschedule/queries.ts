import type { LessonView, RescheduleRequest, SlotsResponse } from '@ab/schedule';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString, pathKey } from '@ab/mobile-kit';

interface RescheduleSlotsParams {
  teacherId: string;
  durationMin: number;
  /** The lesson's students: their other lessons count as clashes. */
  studentIds: readonly string[];
  /** The window (the kit's useSlotWeek): one Riyadh week, never in the past. */
  from: string;
  to: string;
  /** Grid step in minutes (the edit sheet asks for 15); the API defaults to the duration. */
  stepMin?: number;
  /** The lesson being edited is not a clash with itself. */
  excludeLessonId?: string;
  /** Admin GET /booking/slots, or sales' GET /sales/booking/slots (her students only). */
  path?: string;
  /** Sales: the lesson being moved, so its students may be any family's (docs/16 row 37). */
  lessonId?: string;
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
    stepMin: p.stepMin,
    excludeLessonId: p.excludeLessonId,
    lessonId: p.lessonId,
  };
  const path = p.path ?? '/booking/slots';
  return useQuery({
    queryKey: [...pathKey(path), params],
    queryFn: () => apiFetch<SlotsResponse>(`${path}${toQueryString(params)}`),
  });
}

/** Every lesson list refetches; the API already queued the guardian's WhatsApp confirmation. */
export function useReschedule(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: RescheduleRequest) =>
      apiSend<LessonView>('POST', `/lessons/${lessonId}/reschedule`, body),
    onSuccess: () => client.invalidateQueries({ queryKey: pathKey('/lessons') }),
  });
}
