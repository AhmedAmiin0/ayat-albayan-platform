import type { BookingRequest } from '@ab/shared';
import { salesCourseCalls } from '@ab/client-core';
import type { BookingResult } from '@ab/schedule';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { salesCourseKeys } from '@/core/lib/keys';
import { bookingCallsOf } from '@/booking';

const COURSE = '/sales/booking/course';
const salesCourse = salesCourseCalls({ apiFetch, apiSend });

/** GET /sales/booking/course?studentId=: the student, the plan and why she may not book it. */
export function useSalesCourse(studentId: string) {
  return useQuery({
    queryKey: salesCourseKeys.course(studentId),
    queryFn: () => salesCourse.view(studentId),
    enabled: studentId !== '',
  });
}

/** Keyed by the body minus its idempotency key; never retried. */
export function useCourseCheck(body: BookingRequest | null) {
  const key: Partial<BookingRequest> = { ...body };
  delete key.clientRequestId;
  return useQuery({
    queryKey: salesCourseKeys.check(JSON.stringify(key)),
    queryFn: body ? () => bookingCallsOf.sales.check(body) : skipToken,
    retry: false,
  });
}

/** PUT …/course/draft: null = kept as a draft, booked after the payment. */
async function saveDraft(body: BookingRequest): Promise<BookingResult | null> {
  const saved = await salesCourse.draft(body);
  return saved.state === 'booked' ? saved.booking : null;
}

/** R-ASST-01: hold mode keeps a draft until payment; one clientRequestId per wizard (rule 8). */
export function useBookCourse(hold = false) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['sales', 'booking', 'course'],
    mutationFn: (body: BookingRequest): Promise<BookingResult | null> =>
      hold ? saveDraft(body) : bookingCallsOf.sales.book(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: pathKey('/lessons') });
      void client.invalidateQueries({ queryKey: pathKey(COURSE) });
    },
  });
}
