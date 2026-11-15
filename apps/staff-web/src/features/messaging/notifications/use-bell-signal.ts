import { newestOfKind, type PushKind } from '@ab/shared';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { notificationsQuery } from './api';

/**
 * Invalidates `refresh` once the bell shows a new row of `kind` (owner 2026-10-29: «محفظتي» moves when a
 * commission is earned). This observer sets no interval: the header bell's 30 s poll and the window's focus
 * bring the row, so watching costs no request.
 */
export function useBellSignal(kind: PushKind, refresh: QueryKey): void {
  const client = useQueryClient();
  const { data: newest } = useQuery({ ...notificationsQuery, refetchInterval: false, staleTime: 30_000, select: (p) => newestOfKind(p, kind) });
  const seen = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (newest === undefined) return;
    if (seen.current !== undefined && seen.current !== newest) void client.invalidateQueries({ queryKey: refresh });
    seen.current = newest;
  }, [client, newest, refresh]);
}
