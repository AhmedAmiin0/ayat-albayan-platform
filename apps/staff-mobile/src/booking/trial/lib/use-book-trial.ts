import type { LeadView } from '@ab/shared';
import type { BookingResult } from '@ab/schedule';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiSend, pathKey } from '@ab/mobile-kit';
import { patchCached } from '@/core/lib/query/paging';
import { toBookingRequest } from './booking-body';
import { bookingPath, useBookingMode } from '@/booking/shared/booking-mode';
import type { StudentChoice, TrialDraft } from './draft';
import { allowedNextStatuses } from '@ab/catalog';

interface BookTrialInput {
  draft: TrialDraft;
  choice?: StudentChoice;
}

/** One clientRequestId per wizard resent on retry, so a double tap books once (rule 8). */
export function useBookTrial(requestId: string) {
  const client = useQueryClient();
  const path = bookingPath(useBookingMode());
  return useMutation({
    mutationKey: ['booking', 'trial'],
    mutationFn: (input: BookTrialInput) => {
      const body = toBookingRequest(input.draft, { requestId, choice: input.choice ?? null });
      if (!body) throw new Error('booking_incomplete');
      return apiSend<BookingResult>('POST', path, body);
    },
    // Not awaited: the booked panel shows as soon as the API answers.
    onSuccess: (_result, input) => {
      const id = input.draft.leadId;
      const lead = client.getQueryData<LeadView>(pathKey(`/leads/${id}`));
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
