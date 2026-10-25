import type { BookingResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend } from '@/core/lib/http/api';
import { makeupRequest } from './makeup-body';
import type { MakeupDraft } from './makeup-draft';

/**
 * «احجز» for a makeup: POST /booking with the wizard's one clientRequestId (the one the invoice
 * was uploaded under), re-sent on every retry, so a lost reply replays to the first booking.
 * No lead is involved; the schedule and the chats refetch.
 */
export function useBookMakeup(requestId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['booking', 'makeup'],
    mutationFn: (draft: MakeupDraft) => {
      const body = makeupRequest(draft, requestId);
      if (!body) throw new Error('booking_incomplete');
      return apiSend<BookingResult>('POST', '/booking', body);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['lessons'] });
      void client.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
