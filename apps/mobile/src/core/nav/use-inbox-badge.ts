import {
  INBOX_LIST_REFRESH_MS,
  liveInterval,
  UNREAD_COUNT_KEY,
  UNREAD_COUNT_PATH,
  unreadTotal,
} from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { canOpen } from '@/core/auth/route-permissions';
import type { Can } from '@/core/auth/use-permissions';
import { apiFetch } from '@/core/lib/http/api';
import { useInboxLive } from '@/inbox';
import { badgeText } from './tab-badge';

/**
 * The badge's poll (docs/44 BUG4): the chats list's pace while realtime is down, the list's
 * INBOX_FALLBACK_MS net while it is up (a socket that died quietly still reads SUBSCRIBED). Only
 * while the app is active: TanStack skips an interval tick in the background (focusManager).
 */
export const badgePollMs = (live: boolean): number => liveInterval(live, INBOX_LIST_REFRESH_MS);

/**
 * Badge text for the Inbox tab (R-MOB-02): threads with an unopened message, read from the chats
 * list's own summary (GET /threads, unread, one row; the web's key and path, client-core). Under
 * ['threads', 'nav-count'], so every nudge that re-reads the list re-reads it too (refreshLists, a
 * realtime event, resumeInbox, the open chat stamping a message read). A brand-new lead is also an
 * unread thread, so new leads are not added. A role that cannot read the inbox requests nothing.
 */
export function useInboxBadge(can: Can): string | undefined {
  const live = useInboxLive();
  const unread = useQuery({
    enabled: canOpen(can, 'inbox'),
    queryKey: [...UNREAD_COUNT_KEY],
    queryFn: async ({ signal }) => unreadTotal(await apiFetch(UNREAD_COUNT_PATH, { signal })),
    staleTime: 60_000,
    refetchInterval: badgePollMs(live),
  });
  return badgeText(unread.data);
}
