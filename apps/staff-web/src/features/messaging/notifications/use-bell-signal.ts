import { newestOfKind } from '@ab/shared';
import type { PushKind } from '@ab/catalog';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { notificationsQuery } from '@ab/web-kit';

/** Sets no interval: the header bell's 30 s poll and window focus bring the row. */
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
