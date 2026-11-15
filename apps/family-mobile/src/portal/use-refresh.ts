import { useQueryClient } from '@tanstack/react-query';
import { PORTAL_KEY } from '@ab/client-core';

/** Pull to refresh on a family screen: every portal read again (the bell has its own poll). */
export function useRefreshPortal(): () => Promise<void> {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: PORTAL_KEY });
}
