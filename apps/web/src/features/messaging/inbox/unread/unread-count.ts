import { liveInterval, UNREAD_COUNT_KEY, UNREAD_COUNT_PATH, unreadTotal } from '@ab/client-core';
import { ApiError, apiFetch } from '@/lib/http/api';
import { env } from '@/lib/http/env';
import { inboxLive } from '@/features/messaging/inbox/api/live';

/** A signed-out session (401) is not retried: the next poll, or the sign-in, asks again. */
export const unreadRetry = (count: number, error: unknown): boolean =>
  !(error instanceof ApiError && error.status === 401) && count < 3;

/**
 * The badge's poll (docs/44 BUG4): the chats list's own pace while realtime is down, and the same
 * INBOX_FALLBACK_MS net as the list while it is up (a quietly dead socket still reads SUBSCRIBED).
 */
export const unreadPollMs = (): number => liveInterval(inboxLive.isLive(), env.inboxListRefreshMs);

/**
 * The academy's unread chats, for the admin nav badge and the sales «المحادثات» count and tab
 * title: ONE query (one key, one path) over the chats list's own summary (GET /threads, unread,
 * one row). Under ['threads'], so a send, an opened chat and every realtime event that re-reads
 * the list re-read it too. A hidden tab does not poll (owner 2026-10-27): it catches up when shown.
 */
export const unreadCountQuery = (enabled: boolean) => ({
  enabled,
  queryKey: [...UNREAD_COUNT_KEY],
  queryFn: async ({ signal }: { signal: AbortSignal }) =>
    unreadTotal(await apiFetch(UNREAD_COUNT_PATH, { signal })),
  refetchInterval: unreadPollMs,
  retry: unreadRetry,
});
