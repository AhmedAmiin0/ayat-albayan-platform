import { newestOfKind } from '@ab/shared';
import type { PushKind } from '@ab/catalog';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { notificationsListQuery } from '@ab/mobile-kit';

/**
 * Refreshes `refresh` when a new bell row of `kind` arrives (the wallet moves when a commission
 * lands). It watches the bell's own query and adds no interval of its own: the header bell's 30 s
 * poll (and the app coming back to the foreground) carries the news, so no extra request is made.
 */
export function useBellSignal(kind: PushKind, refresh: QueryKey): void {
  const queryClient = useQueryClient();
  const latest = useQuery({
    ...notificationsListQuery,
    refetchInterval: false,
    staleTime: 30_000,
    select: (page) => newestOfKind(page, kind),
  }).data;
  const last = useRef(latest);
  useEffect(() => {
    if (latest === undefined) return;
    const arrived = last.current !== undefined && latest !== last.current;
    last.current = latest;
    if (arrived) void queryClient.invalidateQueries({ queryKey: refresh });
  }, [latest, queryClient, refresh]);
}
