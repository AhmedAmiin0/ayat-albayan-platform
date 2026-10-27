import { afterEach, describe, expect, it, vi } from 'vitest';
import { INBOX_REFRESH_MS, inboxPollMs, threadFileQuery, threadQuery, threadsQuery } from './api';
import { inboxLive } from './live';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

/** The interval as TanStack calls it (a function of the query, unused here). */
function interval(value: unknown): unknown {
  return typeof value === 'function' ? (value as () => unknown)() : value;
}

describe('threadQuery polls only while the window has focus (W13)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    apiFetch.mockReset();
  });

  it('an unfocused document: no poll, so a background chat marks nothing read', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    expect(interval(threadQuery('+966501234567').refetchInterval)).toBe(false);
  });

  it('a focused document: the full re-read every 60 s (the delta poll brings rows between, thread-delta.ts)', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    expect(INBOX_REFRESH_MS).toBe(10_000);
    expect(interval(threadQuery('+966501234567').refetchInterval)).toBe(60_000);
  });

  it('the list keeps a numeric 15 s interval, focused or not (unread rows still rise)', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    expect(interval(threadsQuery({ page: 1 }).refetchInterval)).toBe(15_000);
    expect(inboxPollMs()).toBe(INBOX_REFRESH_MS);
  });

  it('realtime connected: the list, the badge and the full re-read at the 60 s fallback; dropped: their own intervals again', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    inboxLive.setLive(true);
    const polls = () => [interval(threadsQuery({ page: 1 }).refetchInterval), inboxPollMs(), interval(threadQuery('+966501234567').refetchInterval)];
    expect(polls()).toEqual([60_000, 60_000, 60_000]);
    inboxLive.setLive(false);
    expect(polls()).toEqual([15_000, INBOX_REFRESH_MS, 60_000]);
  });
});

describe('threadFileQuery', () => {
  it('asks the thread file route with the phone url-encoded, and never retries', async () => {
    apiFetch.mockResolvedValue({ url: 'https://x/signed', expires_at: '2026-10-19T10:00:00Z', mime: 'image/png' });
    const q = threadFileQuery('+966501234567', 'm-1');
    expect(q.retry).toBe(false);
    expect(q.queryKey[0]).not.toBe('threads'); // a thread invalidation must not sign it again
    const fn = q.queryFn as unknown as () => Promise<unknown>;
    await expect(fn()).resolves.toMatchObject({ url: 'https://x/signed' });
    expect(apiFetch).toHaveBeenCalledWith('/threads/%2B966501234567/messages/m-1/file');
  });
});
