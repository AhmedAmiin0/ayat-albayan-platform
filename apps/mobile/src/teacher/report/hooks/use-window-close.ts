import { msUntilClose } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { refreshAfterSubmit } from './api';

/** A second after the close, so the server already answers can_edit = false. */
const AFTER_CLOSE_MS = 1_000;

/**
 * docs/46 B5: when a report's edit window closes while its form is open, refetch the form and the
 * lists (the server's can_edit turns false and «تعديل التقرير» goes), instead of offering an edit
 * the API would refuse. Nothing is scheduled for a draft or a window already closed.
 */
export function useWindowClose(editUntil: string | null): void {
  const client = useQueryClient();
  useEffect(() => {
    const left = msUntilClose(editUntil, new Date());
    if (left === null) return undefined;
    const id = setTimeout(() => void refreshAfterSubmit(client), left + AFTER_CLOSE_MS);
    return () => clearTimeout(id);
  }, [client, editUntil]);
}
