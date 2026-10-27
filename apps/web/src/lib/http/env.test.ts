import { describe, expect, it } from 'vitest';
import { env, intervalMs } from './env';

describe('intervalMs: an optional poll interval from the build env', () => {
  it('unset, blank, not a whole number or under 500 ms → the fallback', () => {
    for (const raw of [undefined, '', 'abc', '1.5', '100']) expect(intervalMs(raw, 10_000)).toBe(10_000);
  });

  it('a whole number of at least 500 ms is used', () => {
    expect(intervalMs('1000', 10_000)).toBe(1_000);
    expect(intervalMs('500', 10_000)).toBe(500);
  });

  it('unset VITE_INBOX_REFRESH_MS: the chat delta every 10 s, the chats list every 15 s, a full chat read every 60 s', () => {
    expect([env.inboxRefreshMs, env.inboxListRefreshMs, env.threadFullRefreshMs]).toEqual([10_000, 15_000, 60_000]);
  });
});
