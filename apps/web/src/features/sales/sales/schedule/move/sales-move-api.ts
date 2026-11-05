import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/lib/http/api';

/**
 * POST /sales/lessons/:id/reschedule { startsAt } (lessons.reschedule): the admin's one-lesson
 * move, her the actor; the answer is not read: every sales read refetches (the day, the student).
 */
export function useSalesMove(lessonId: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (startsAt: string) =>
      apiSend('POST', `/sales/lessons/${lessonId}/reschedule`, { startsAt }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['sales'] });
      onDone();
    },
  });
}
