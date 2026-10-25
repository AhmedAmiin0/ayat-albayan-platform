import { useQueries } from '@tanstack/react-query';
import { canOpen } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { apiFetch } from '@/core/lib/http/api';
import { badgeText } from './tab-badge';

type Total = { total: number };

/** `total` of a paged list at pageSize=1. Keys sit under the feature prefix, so the inbox's own
 *  invalidateQueries(['threads']) refresh the badge too (as on the web). */
const countQuery = (prefix: string, path: string, enabled: boolean) => ({
  enabled,
  queryKey: [prefix, 'nav-count', path],
  queryFn: () => apiFetch<Total>(path),
  staleTime: 60_000,
  select: (page: Total) => page.total,
});

/**
 * Badge text for the Inbox tab (R-MOB-02): threads with an unopened message. A brand-new lead is also an
 * unread thread, so new leads are not added (the web counts them on their own nav item). A count the
 * role cannot read is not requested (no 403).
 */
export function useInboxBadge(can: Can): string | undefined {
  const [unread] = useQueries({
    queries: [countQuery('threads', '/threads?unread=true&page=1&pageSize=1', canOpen(can, 'inbox'))],
  });
  return badgeText(unread.data);
}
