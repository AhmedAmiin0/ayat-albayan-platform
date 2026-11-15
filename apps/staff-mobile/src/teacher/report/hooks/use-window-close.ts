import { scheduleCloseRefetch } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { refreshAfterSubmit } from './api';

/**
 * docs/46 B5: when a report's edit window closes while its form is open, refetch the form and the
 * lists (the server's can_edit turns false and «تعديل التقرير» goes), instead of offering an edit
 * the API would refuse. The card reads the refetched window (withServerWindow); while the server
 * still says can_edit after the close, one more refetch follows (scheduleCloseRefetch).
 */
export function useWindowClose(report: Pick<ReportView, 'edit_until' | 'can_edit'>): void {
  const client = useQueryClient();
  const [round, setRound] = useState(0);
  const { edit_until, can_edit } = report;
  useEffect(() => {
    const refetch = () => refreshAfterSubmit(client);
    return scheduleCloseRefetch(
      { edit_until, can_edit },
      { round, refetch, next: () => setRound(round + 1) },
    );
  }, [client, edit_until, can_edit, round]);
}
