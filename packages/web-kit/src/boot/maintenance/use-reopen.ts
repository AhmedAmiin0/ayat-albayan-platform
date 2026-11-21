import { useQueryClient } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/**
 * When the cover lifts, the page under it reloads what failed meanwhile: the route's loaders
 * (router.invalidate) and every errored query. An effect: it follows a change of the verdict.
 */
export function useReopen(covered: boolean, router: AnyRouter): void {
  const client = useQueryClient();
  const was = useRef(covered);
  useEffect(() => {
    const reopened = was.current && !covered;
    was.current = covered;
    if (!reopened) return;
    void router.invalidate();
    void client.refetchQueries({ type: 'active', predicate: (q) => q.state.status === 'error' });
  }, [covered, client, router]);
}
