import type { LessonTimeEdit, TimeEditResult } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend, pathKey } from '@ab/mobile-kit';
import { isStale } from './edit-time-errors';

/**
 * PATCH /lessons/:id/time (R-SCH-11): the same lesson, a new start and length. On success every
 * lesson list (Today, the calendars) refetches; so it does when the lesson turned out to have
 * changed under us (stale_time), so the next open shows what is really there.
 */
export function useEditTime(lessonId: string) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: pathKey('/lessons') });
  return useMutation({
    mutationFn: (body: LessonTimeEdit) => apiSend<TimeEditResult>('PATCH', `/lessons/${lessonId}/time`, body),
    onSuccess: refresh,
    onError: (error) => (isStale(error) ? refresh() : undefined),
  });
}
