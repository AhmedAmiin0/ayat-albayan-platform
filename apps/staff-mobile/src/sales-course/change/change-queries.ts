import type { CourseChangeCheck, CourseChangeResult } from '@ab/shared';
import type { CourseChangeRequest } from '@ab/schedule';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiSend, pathKey } from '@ab/mobile-kit';
import { salesCourseKeys } from '@/core/lib/keys';

const CHANGE = '/sales/booking/course/change';

/**
 * POST …/course/change/check: the new days' clashes over the whole remaining course, how many lessons
 * are left and the new last day; nothing written. Keyed by the body minus its idempotency key; never retried.
 * Dropped once unmounted (gcTime 0): the course refetch after a save does not reach it, so a kept answer
 * would show the old summary when the same days are picked again.
 */
export function useCourseChangeCheck(body: CourseChangeRequest | null, path = CHANGE) {
  const key: Partial<CourseChangeRequest> = { ...body };
  delete key.clientRequestId;
  return useQuery({
    queryKey: salesCourseKeys.changeCheck(path, JSON.stringify(key)),
    queryFn: () => apiSend<CourseChangeCheck>('POST', `${path}/check`, body),
    enabled: body !== null,
    retry: false,
    gcTime: 0,
  });
}

/** Rule 8: one clientRequestId per flow, re-sent on every retry. */
export function useChangeCourse(path = CHANGE) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['sales', 'booking', 'course-change'],
    mutationFn: (body: CourseChangeRequest) => apiSend<CourseChangeResult>('POST', path, body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: pathKey('/lessons') });
      void client.invalidateQueries({ queryKey: pathKey('/students') });
      void client.invalidateQueries({ queryKey: pathKey('/sales/booking/course') });
    },
  });
}
