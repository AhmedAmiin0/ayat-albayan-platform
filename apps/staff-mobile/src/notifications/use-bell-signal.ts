import { newestOfKind, type PushKind } from '@ab/shared';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { notificationsListQuery } from '@ab/mobile-kit';

/** Piggybacks on the bell's 30 s poll and foreground return, adding no request of its own. */
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
