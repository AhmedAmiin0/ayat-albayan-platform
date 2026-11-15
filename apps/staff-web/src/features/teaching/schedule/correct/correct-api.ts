import type { CorrectTo, LessonStatus } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/http/api';
import { LESSONS_KEY } from '@/features/teaching/schedule/api';

/** Whose route: the admin's (lessons.write) or sales' (lessons.cancel). */
export type CorrectArea = 'admin' | 'sales';

const PATH: Record<CorrectArea, (id: string) => string> = {
  admin: (id) => `/lessons/${id}/correct`,
  sales: (id) => `/sales/lessons/${id}/correct`,
};
const REFETCH: Record<CorrectArea, readonly string[]> = {
  admin: LESSONS_KEY,
  sales: ['sales', 'schedule'],
};

/**
 * POST …/lessons/:id/correct { to } (owner 2026-11-03, «تصحيح حالة الحلقة»). Success or a 409, the
 * schedule re-reads so the drawer's lesson and the package counts are current.
 */
export function useCorrectLesson(lessonId: string, area: CorrectArea) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (to: CorrectTo) => apiSend('POST', PATH[area](lessonId), { to }),
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
