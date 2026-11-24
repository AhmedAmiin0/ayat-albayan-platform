import { scheduleCloseRefetch } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { refreshAfterSubmit } from './api';

/** When the edit window closes (docs/46 B5), refetch so no edit the API would refuse is offered. */
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
