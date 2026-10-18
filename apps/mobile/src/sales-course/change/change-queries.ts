import type { CourseChangeCheck, CourseChangeRequest, CourseChangeResult } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

const CHANGE = '/sales/booking/course/change';

/**
 * POST …/course/change/check: the new days' clashes over the whole remaining course, how many lessons
 * are left and the new last day; nothing written. Keyed by the body minus its idempotency key; never retried.
 */
export function useCourseChangeCheck(body: CourseChangeRequest | null) {
  const key: Partial<CourseChangeRequest> = { ...body };
  delete key.clientRequestId;
  return useQuery({
    queryKey: ['sales', 'booking', 'course-change', 'check', JSON.stringify(key)],
    queryFn: () => apiSend<CourseChangeCheck>('POST', `${CHANGE}/check`, body),
    enabled: body !== null,
    retry: false,
  });
}

/**
 * «احفظ الأيام الجديدة»: POST …/course/change, re-sent with the flow's one clientRequestId on every
 * retry (rule 8). The schedule and the course refetch, as after «احجز».
 */
export function useChangeCourse() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['sales', 'booking', 'course-change'],
    mutationFn: (body: CourseChangeRequest) => apiSend<CourseChangeResult>('POST', CHANGE, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['lessons'] });
      void client.invalidateQueries({ queryKey: pathKey('/sales/booking/course') });
    },
  });
}
