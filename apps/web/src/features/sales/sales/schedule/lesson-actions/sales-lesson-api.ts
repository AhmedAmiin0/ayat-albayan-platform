import type { CancelRequest } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CancelRoute } from '@/features/teaching/schedule';
import { apiSend } from '@/lib/http/api';

/** Every sales read (the day, «تفاصيل الطالب»): a moved or cancelled lesson refetches them all. */
const SALES_KEY = ['sales'] as const;

/**
 * The admin's «إلغاء الحلقة» form (CancelForm) sent to the assistant's route (owner 2026-11-02):
 * POST /sales/lessons/:id/cancel { by, reason }, one lesson only (the form offers no series here).
 */
export const salesCancelRoute = (lessonId: string): CancelRoute => ({
  send: ({ by, reason }: CancelRequest) =>
    apiSend('POST', `/sales/lessons/${lessonId}/cancel`, {
      by,
      reason,
    }),
  refresh: SALES_KEY,
});

/** POST /sales/lessons/:id/reschedule { startsAt }: the admin's one-lesson move, her the actor;
 * the answer is not read (the day refetches). */
export function useSalesReschedule(lessonId: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (startsAt: string) =>
      apiSend('POST', `/sales/lessons/${lessonId}/reschedule`, { startsAt }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: SALES_KEY });
      onDone();
    },
  });
}
