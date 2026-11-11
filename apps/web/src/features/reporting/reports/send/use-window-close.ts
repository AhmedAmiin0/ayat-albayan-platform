import { closeRefetchIn } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { LESSONS_KEY } from '@/features/teaching/schedule';
import { REPORTS_KEY } from '@/features/reporting/reports/api';

/**
 * docs/46 B5 (as the phone's useWindowClose): when a report's edit window closes while it is on
 * screen, refetch the form and the lists, so the open card (withServerWindow) shows it closed
 * instead of offering an edit the API refuses; one more refetch while the server still says
 * can_edit after the close. Nothing for a draft or a window already closed.
 */
export function useWindowClose(report: Pick<ReportView, 'edit_until' | 'can_edit'>): void {
  const client = useQueryClient();
  const [round, setRound] = useState(0);
  const { edit_until: editUntil, can_edit: canEdit } = report;
  useEffect(() => {
    const window = { edit_until: editUntil, can_edit: canEdit };
    const wait = closeRefetchIn(window, { now: new Date(), round });
    if (wait === null) return undefined;
    const refetch = () =>
      Promise.all([
        client.invalidateQueries({ queryKey: LESSONS_KEY }),
        client.invalidateQueries({ queryKey: REPORTS_KEY }),
      ]).then(() => setRound((r) => r + 1));
    const id = setTimeout(() => void refetch(), wait);
    return () => clearTimeout(id);
  }, [client, editUntil, canEdit, round]);
}
