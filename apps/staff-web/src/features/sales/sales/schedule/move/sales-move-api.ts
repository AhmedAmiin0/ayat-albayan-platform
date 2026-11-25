import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reasonPart } from '@/features/teaching/schedule';
import { apiSend } from '@ab/web-kit';
import { salesKeys } from '@/features/sales/keys';

export interface SalesMoveInput {
  startsAt: string;
  /** Optional reason (docs/47), sent only when written. */
  reason: string;
}

/**
 * POST /sales/lessons/:id/reschedule { startsAt, reason? } (lessons.reschedule): the admin's
 * one-lesson move, her the actor; the answer is not read: every sales read refetches (the day,
 * the student).
 */
export function useSalesMove(lessonId: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ startsAt, reason }: SalesMoveInput) =>
      apiSend('POST', `/sales/lessons/${lessonId}/reschedule`, { startsAt, ...reasonPart(reason) }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: salesKeys.all });
      onDone();
    },
  });
}
