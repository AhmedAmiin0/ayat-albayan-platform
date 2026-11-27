import { salesLessonActionCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reasonPart } from '@/features/teaching/schedule';
import { apiFetch, apiSend } from '@ab/web-kit';
import { salesKeys } from '@/features/sales/keys';

const lessons = salesLessonActionCalls({ apiFetch, apiSend });

export interface SalesMoveInput {
  startsAt: string;
  /** Optional reason (docs/47), sent only when written. */
  reason: string;
}

/**
 * The admin's one-lesson move (lessons.reschedule), her the actor; the answer is not read: every
 * sales read refetches (the day, the student).
 */
export function useSalesMove(lessonId: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ startsAt, reason }: SalesMoveInput) =>
      lessons.reschedule({ lessonId, body: { startsAt, ...reasonPart(reason) } }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: salesKeys.all });
      onDone();
    },
  });
}
