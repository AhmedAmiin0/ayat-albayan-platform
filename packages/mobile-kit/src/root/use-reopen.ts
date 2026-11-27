import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { retryStartup } from './retry-startup';

/**
 * When the cover lifts: the session, /auth/me and the connection again (retryStartup), and every
 * query that failed meanwhile. An effect: it follows a change of the verdict.
 */
export function useReopen(covered: boolean): void {
  const client = useQueryClient();
  const was = useRef(covered);
  useEffect(() => {
    const reopened = was.current && !covered;
    was.current = covered;
    if (!reopened) return;
    retryStartup();
    void client.refetchQueries({ type: 'active', predicate: (q) => q.state.status === 'error' });
  }, [covered, client]);
}
