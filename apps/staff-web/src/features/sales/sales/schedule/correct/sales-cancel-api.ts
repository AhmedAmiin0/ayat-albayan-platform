import type { SalesCancel } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@ab/web-kit/lib/http/api';
import { salesKeys } from '@/features/sales/keys';

/**
 * POST /sales/lessons/:id/cancel `{ reason?, by? }` (lessons.cancel): this lesson only, no message
 * to the family; by teacher | student also after the end, and corrects a lesson held automatically.
 * Success or a 409, the day re-reads so the drawer's lesson is current.
 */
export function useSalesCancelLesson(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SalesCancel) => apiSend('POST', `/sales/lessons/${lessonId}/cancel`, body),
    onSettled: () => client.invalidateQueries({ queryKey: salesKeys.schedule }),
  });
}
