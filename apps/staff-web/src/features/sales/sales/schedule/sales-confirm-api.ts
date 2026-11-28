import { salesLessonActionCalls } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { salesKeys } from '@/features/sales/keys';

const lessons = salesLessonActionCalls({ apiFetch, apiSend });

/** Scheduled to confirmed, any lesson, no message sent. */
export function useSalesConfirmLesson(lessonId: string, onConfirmed: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => lessons.confirm(lessonId),
    onSuccess: onConfirmed,
    // A 409 (cancelled or confirmed elsewhere) re-reads the day too, so the stale button goes.
    onSettled: () => client.invalidateQueries({ queryKey: salesKeys.schedule }),
  });
}
