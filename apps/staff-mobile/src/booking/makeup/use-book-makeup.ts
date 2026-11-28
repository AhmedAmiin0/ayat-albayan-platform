import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingCallsOf } from '@/booking/shared/booking-calls';
import { makeupRequest } from './makeup-body';
import type { MakeupDraft } from './makeup-draft';

/** One clientRequestId resent on every retry, so a lost reply replays the first booking. */
export function useBookMakeup(requestId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['booking', 'makeup'],
    mutationFn: (draft: MakeupDraft) => {
      const body = makeupRequest(draft, requestId);
      if (!body) throw new Error('booking_incomplete');
      return bookingCallsOf.admin.book(body);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['lessons'] });
      void client.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}
