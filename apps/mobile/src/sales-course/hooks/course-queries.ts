import { courseDraftSavedSchema } from '@ab/shared';
import type { BookingRequest, BookingResult, Conflict, SalesCourseView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, toQueryString } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

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

/** PUT …/course/draft (owner 2026-11-06): null = kept as a draft, booked after the payment. */
/** apiSend with its reply left unknown, for the schema to parse. */
const put: (method: 'PUT', path: string, body: unknown) => Promise<unknown> = apiSend;

async function saveDraft(body: BookingRequest): Promise<BookingResult | null> {
  const saved = courseDraftSavedSchema.parse(await put('PUT', `${COURSE}/draft`, body));
  return saved.state === 'booked' ? saved.booking : null;
}

/**
 * «احجز» (R-ASST-01): POST /sales/booking, or in hold mode (unpaid with an open payment link,
 * owner 2026-11-06) the draft kept until the payment (null; booked at once if paid meanwhile),
 * re-sent with the wizard's one clientRequestId on every
 * retry, so a lost reply replays to the first booking (rule 8). The schedule and the course refetch.
 */
export function useBookCourse(hold = false) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['sales', 'booking', 'course'],
    mutationFn: (body: BookingRequest): Promise<BookingResult | null> =>
      hold ? saveDraft(body) : apiSend<BookingResult>('POST', '/sales/booking', body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['lessons'] });
      void client.invalidateQueries({ queryKey: pathKey(COURSE) });
    },
  });
}
