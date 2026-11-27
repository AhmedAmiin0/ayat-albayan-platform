import { salesLessonActionCalls } from '@ab/client-core';
import type { SalesCancel } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { salesKeys } from '@/features/sales/keys';

const lessons = salesLessonActionCalls({ apiFetch, apiSend });

/**
 * This lesson only (lessons.cancel), no message to the family; by teacher | student also after the
 * end, and corrects a lesson held automatically. Success or a 409, the day re-reads so the
 * drawer's lesson is current.
 */
export function useSalesCancelLesson(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SalesCancel) => lessons.cancel({ lessonId, body }),
    onSettled: () => client.invalidateQueries({ queryKey: salesKeys.schedule }),
  });
}
