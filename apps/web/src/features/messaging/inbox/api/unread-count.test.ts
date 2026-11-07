import { INBOX_FALLBACK_MS } from '@ab/client-core';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { env } from '@/lib/http/env';
import { inboxLive } from './live';
import { unreadCountQuery, unreadPollMs, unreadRetry } from './unread-count';

afterEach(() => inboxLive.setLive(false));

describe('unreadCountQuery: the badge reads what the list reads (docs/44 BUG4)', () => {
  it('one key under ["threads", "nav-count"], never polled from a hidden tab', () => {
    const q = unreadCountQuery(true);
    expect(q.queryKey).toEqual(['threads', 'nav-count', 'unread']);
    expect(q.refetchInterval).toBe(unreadPollMs);
    expect('refetchIntervalInBackground' in q).toBe(false);
    expect(unreadCountQuery(false).enabled).toBe(false);
  });

  it('polls at the list’s pace while realtime is down, the list’s fallback net while it is up', () => {
    expect(unreadPollMs()).toBe(env.inboxListRefreshMs);
    inboxLive.setLive(true);
    expect(unreadPollMs()).toBe(INBOX_FALLBACK_MS);
  });

  it('never retries a 401; other failures up to 3 times', () => {
    expect(unreadCountQuery(true).retry).toBe(unreadRetry);
    expect(unreadRetry(0, new ApiError(401, null))).toBe(false);
    expect(unreadRetry(0, new ApiError(500, null))).toBe(true);
    expect(unreadRetry(3, new ApiError(500, null))).toBe(false);
  });
});
