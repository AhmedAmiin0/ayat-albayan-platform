import type { BookingRequest, BookingResult, Conflict, SalesCourseView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

const COURSE = '/sales/booking/course';

/** GET /sales/booking/course?studentId=: the student, the plan and why she may not book it. */
export function useSalesCourse(studentId: string) {
  return useQuery({
    queryKey: [...pathKey(COURSE), { studentId }],
    queryFn: () => apiFetch<SalesCourseView>(`${COURSE}${toQueryString({ studentId })}`),
    enabled: studentId !== '',
  });
}

/**
 * POST /sales/booking/check: the whole course's clashes (every week, every day) and the course
 * guard's refusals, before «احجز». Keyed by the body minus its idempotency key; never retried.
 */
export function useCourseCheck(body: BookingRequest | null) {
  const key: Partial<BookingRequest> = { ...body };
  delete key.clientRequestId;
  return useQuery({
    queryKey: ['sales', 'booking', 'check', JSON.stringify(key)],
    queryFn: () => apiSend<{ conflicts: Conflict[] }>('POST', '/sales/booking/check', body),
    enabled: body !== null,
    retry: false,
  });
}

/**
 * «احجز» (R-ASST-01): POST /sales/booking, re-sent with the wizard's one clientRequestId on every
 * retry, so a lost reply replays to the first booking (rule 8). The schedule and the course refetch.
 */
export function useBookCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['sales', 'booking', 'course'],
    mutationFn: (body: BookingRequest) => apiSend<BookingResult>('POST', '/sales/booking', body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['lessons'] });
      void client.invalidateQueries({ queryKey: pathKey(COURSE) });
    },
  });
}
