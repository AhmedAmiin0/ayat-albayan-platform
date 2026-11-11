import { scheduleCloseRefetch } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { REPORTS_KEY } from '@/features/reporting/reports/api';

/** The form (under REPORTS_KEY) and the lesson lists, as a submit refreshes them. */
const refreshForm = (client: QueryClient) =>
  Promise.all([LESSONS_KEY, REPORTS_KEY].map((queryKey) => client.invalidateQueries({ queryKey })));

/**
 * docs/46 B5 (as the phone's useWindowClose): when the edit window closes while the report is on
 * screen, refetch, so the open card (withServerWindow) shows it closed instead of offering an
 * edit the API refuses; one more refetch while the server still says can_edit after the close.
 */
export function useWindowClose({
  edit_until: until,
  can_edit: open,
}: Pick<ReportView, 'edit_until' | 'can_edit'>): void {
  const client = useQueryClient();
  const [round, setRound] = useState(0);
  useEffect(
    () =>
      scheduleCloseRefetch(
        { edit_until: until, can_edit: open },
        {
          round,
          refetch: () => refreshForm(client),
          next: () => setRound((done) => done + 1),
        },
      ),
    [client, until, open, round],
  );
}
