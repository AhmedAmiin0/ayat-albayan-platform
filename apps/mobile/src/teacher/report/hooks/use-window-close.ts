import { closeRefetchIn } from '@ab/client-core';
import type { ReportView } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { refreshAfterSubmit } from './api';

/**
 * docs/46 B5: when a report's edit window closes while its form is open, refetch the form and the
 * lists (the server's can_edit turns false and «تعديل التقرير» goes), instead of offering an edit
 * the API would refuse. The card reads the refetched window (withServerWindow); while the server
 * still says can_edit after the close, one more refetch follows. Nothing is scheduled for a draft
 * or a window already closed.
 */
export function useWindowClose(report: Pick<ReportView, 'edit_until' | 'can_edit'>): void {
  const client = useQueryClient();
  const [round, setRound] = useState(0);
  const { edit_until: editUntil, can_edit: canEdit } = report;
  useEffect(() => {
    const window = { edit_until: editUntil, can_edit: canEdit };
    const wait = closeRefetchIn(window, { now: new Date(), round });
    if (wait === null) return undefined;
    const next = () => setRound((r) => r + 1);
    const id = setTimeout(() => void refreshAfterSubmit(client).then(next), wait);
    return () => clearTimeout(id);
  }, [client, editUntil, canEdit, round]);
}
