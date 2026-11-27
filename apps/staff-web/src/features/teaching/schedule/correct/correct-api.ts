import { salesLessonActionCalls } from '@ab/client-core';
import type { LessonStatus } from '@ab/catalog';
import type { CorrectTo } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { LESSONS_KEY } from '@/features/teaching/schedule/api';

/** Whose route: the admin's (lessons.write) or sales' (lessons.cancel). */
export type CorrectArea = 'admin' | 'sales';

const salesLessons = salesLessonActionCalls({ apiFetch, apiSend });

const SEND: Record<CorrectArea, (id: string, to: CorrectTo) => Promise<unknown>> = {
  admin: (id, to) => apiSend('POST', `/lessons/${id}/correct`, { to }),
  sales: (lessonId, to) => salesLessons.correct({ lessonId, body: { to } }),
};
const REFETCH: Record<CorrectArea, readonly string[]> = {
  admin: LESSONS_KEY,
  sales: ['sales', 'schedule'],
};

/** On success or 409 the schedule re-reads so the drawer and package counts are current. */
export function useCorrectLesson(lessonId: string, area: CorrectArea) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (to: CorrectTo) => SEND[area](lessonId, to),
    onSettled: () => client.invalidateQueries({ queryKey: REFETCH[area] }),
  });
}

/** The lesson fields the correction reads (LessonView or a sales schedule row). */
export interface CorrectLesson {
  id: string;
  status: LessonStatus;
  ends_at: string;
  /** LessonView.auto_held; undefined on a sales row (the API decides). */
  auto?: boolean | undefined;
}
