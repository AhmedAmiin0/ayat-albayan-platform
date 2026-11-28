import { liveInterval, UNREAD_COUNT_KEY } from '@ab/client-core';
import { ApiError, env } from '@ab/web-kit';
import { threadReads } from '@/features/messaging/inbox/api/api';
import { inboxLive } from '@/features/messaging/inbox/api/live';

/** A signed-out session (401) is not retried: the next poll, or the sign-in, asks again. */
export const unreadRetry = (count: number, error: unknown): boolean =>
  !(error instanceof ApiError && error.status === 401) && count < 3;

/**
 * The badge's poll (docs/44 BUG4): the chats list's own pace while realtime is down, and the same
 * INBOX_FALLBACK_MS net as the list while it is up (a quietly dead socket still reads SUBSCRIBED).
 */
export const unreadPollMs = (): number => liveInterval(inboxLive.isLive(), env.inboxListRefreshMs);

/** One query under ['threads'] so every re-read refreshes it; a hidden tab does not poll. */
export const unreadCountQuery = (enabled: boolean) => ({
  enabled,
  queryKey: UNREAD_COUNT_KEY,
  queryFn: async ({ signal }: { signal: AbortSignal }) => (await threadReads.unread(signal)).total,
  refetchInterval: unreadPollMs,
  retry: unreadRetry,
});
