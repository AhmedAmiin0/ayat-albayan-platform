import type { BookingResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { allowedNextStatuses } from '@/inbox/allowed-next-statuses';
import type { Lead } from '@/inbox/types';
import { apiSend } from '@/lib/api';
import { patchCached } from '@/lib/paging';
import { pathKey } from '@/lib/query-keys';
import { toBookingRequest } from './booking-body';
import type { StudentChoice, TrialDraft } from './draft';

export interface BookTrialInput {
  draft: TrialDraft;
  choice?: StudentChoice;
}

/**
 * «احجز» (R-MOB-02, R-LEAD-06): POST /booking (a trial, or a paid package from the chat). One
 * clientRequestId per wizard (made when it mounts: the invoice uploads under it), re-sent on every
 * retry (a 409 wrote nothing; a lost reply replays to the first booking), so a double tap or a
 * retry books once (rule 8). Afterwards the lead shows
 * trial_booked / converted at once when the funnel allows it (as the API's leadTarget moves it; it
 * may leave a filtered inbox list), then the inbox lists refetch before the lead, since the lead
 * screen reads its lead out of them; the chats refetch too (the number is a guardian now).
 */
export function useBookTrial(requestId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationKey: ['booking', 'trial'],
    mutationFn: (input: BookTrialInput) => {
      const body = toBookingRequest(input.draft, { requestId, choice: input.choice ?? null });
      if (!body) throw new Error('booking_incomplete');
      return apiSend<BookingResult>('POST', '/booking', body);
    },
    // Not awaited: the booked panel shows as soon as the API answers.
    onSuccess: (_result, input) => {
      const id = input.draft.leadId;
      const lead = client.getQueryData<Lead>(pathKey(`/leads/${id}`));
      const status = input.draft.pkg === 'trial' ? 'trial_booked' : 'converted';
      if (lead && allowedNextStatuses(lead.status).includes(status)) {
        const patch = { id, status };
        client.setQueriesData({ queryKey: ['leads'] }, (old: unknown) => patchCached(old, patch));
      }
      void client.invalidateQueries({ queryKey: ['lessons'] });
      void client.invalidateQueries({ queryKey: ['threads'] });
      void client.invalidateQueries({ queryKey: ['leads', 'list'] }).then(() =>
        client.invalidateQueries({
          queryKey: ['leads'],
          predicate: (q) => q.queryKey[1] !== 'list',
        }),
      );
    },
  });
}
