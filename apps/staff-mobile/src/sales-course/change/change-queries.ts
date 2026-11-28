import { salesCourseCalls } from '@ab/client-core';
import { skipToken, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { salesCourseKeys } from '@/core/lib/keys';
import type { ChangeBody, ChangeCalls } from './change-calls.types';

const salesCourse = salesCourseCalls({ apiFetch, apiSend });

/** The assistant's own course routes, the flow's default. */
const salesChangeCalls: ChangeCalls = {
  key: 'sales',
  check: salesCourse.check,
  change: salesCourse.change,
};

/**
 * POST …/change/check: the new days' clashes over the whole remaining course, how many lessons
 * are left and the new last day; nothing written. Keyed by the body minus its idempotency key;
 * never retried. Dropped once unmounted (gcTime 0): the course refetch after a save does not reach
 * it, so a kept answer would show the old summary when the same days are picked again.
 */
export function useCourseChangeCheck(body: ChangeBody | null, calls = salesChangeCalls) {
  const key = { ...body, clientRequestId: undefined };
  return useQuery({
    queryKey: salesCourseKeys.changeCheck(calls.key, JSON.stringify(key)),
    queryFn: body ? () => calls.check(body) : skipToken,
    retry: false,
    gcTime: 0,
  });
}

/** Rule 8: one clientRequestId per flow, re-sent on every retry. */
export function useChangeCourse(calls = salesChangeCalls) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['sales', 'booking', 'course-change'],
    mutationFn: (body: ChangeBody) => calls.change(body),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: pathKey('/lessons') });
      void client.invalidateQueries({ queryKey: pathKey('/students') });
      void client.invalidateQueries({ queryKey: pathKey('/sales/booking/course') });
    },
  });
}
