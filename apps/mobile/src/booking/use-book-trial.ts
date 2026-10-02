import type { BookingRequest, BookingResult } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { allowedNextStatuses } from '@/inbox/allowed-next-statuses';
import type { Lead } from '@/inbox/types';
import { apiSend } from '@/lib/api';
import { patchCached } from '@/lib/paging';
import { pathKey } from '@/lib/query-keys';
import { requestId } from '@/lib/request-id';
import { toBookingRequest, type StudentChoice, type TrialDraft } from './draft';

export interface BookTrialInput {
  draft: TrialDraft;
  choice?: StudentChoice;
}

/**
 * «احجز» (R-MOB-02, R-LEAD-06): POST /booking with package trial. One clientRequestId per wizard,
 * re-sent on every retry (a 409 wrote nothing; a lost reply replays to the first booking), so a
 * double tap or a retry books once (rule 8). Afterwards the lead shows trial_booked at once when
 * the funnel allows it (as the API moves it; it may leave a filtered inbox list), then the inbox
 * lists refetch before the lead, since the lead screen reads its lead out of them.
 */
export function useBookTrial() {
  const client = useQueryClient();
  const request = useRef<string | null>(null);
  return useMutation({
    mutationKey: ['booking', 'trial'],
    mutationFn: (input: BookTrialInput) => {
      request.current ??= requestId();
      const body: BookingRequest | null = toBookingRequest(input.draft, {
        requestId: request.current,
        choice: input.choice ?? null,
      });
      if (!body) throw new Error('booking_incomplete');
      return apiSend<BookingResult>('POST', '/booking', body);
    },
    // Not awaited: the booked panel shows as soon as the API answers.
    onSuccess: (_result, input) => {
      const id = input.draft.leadId;
      const lead = client.getQueryData<Lead>(pathKey(`/leads/${id}`));
      if (lead && allowedNextStatuses(lead.status).includes('trial_booked')) {
        const patch = { id, status: 'trial_booked' };
        client.setQueriesData({ queryKey: ['leads'] }, (old: unknown) => patchCached(old, patch));
      }
      void client.invalidateQueries({ queryKey: ['lessons'] });
      void client.invalidateQueries({ queryKey: ['leads', 'list'] }).then(() =>
        client.invalidateQueries({
          queryKey: ['leads'],
          predicate: (q) => q.queryKey[1] !== 'list',
        }),
      );
    },
  });
}
