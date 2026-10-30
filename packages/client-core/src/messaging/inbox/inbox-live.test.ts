import { describe, expect, it } from 'vitest';
import { changedPhone, chatLiveKey, INBOX_FALLBACK_MS, liveInterval, refreshPlan, throttleMsOf } from './inbox-live.js';

describe('the thread_changed event → what refreshes', () => {
  it('reads only an E.164 phone from the payload', () => {
    expect(changedPhone({ phone: '+966500000001' })).toBe('+966500000001');
    for (const bad of [null, 'x', 1, {}, { phone: 5 }, { phone: '0500000001' }, { phone: '+0123' }]) {
      expect(changedPhone(bad)).toBeNull();
    }
  });

  it('always the badge and the list, plus that phone’s chat', () => {
    expect(refreshPlan('+966500000001')).toEqual(['badge', 'list', chatLiveKey('+966500000001')]);
  });

  it('a chat waits 1 s between fetches, the list and the badge 3 s', () => {
    expect(throttleMsOf(chatLiveKey('+966500000001'))).toBe(1_000);
    expect(throttleMsOf('list')).toBe(3_000);
    expect(throttleMsOf('badge')).toBe(3_000);
  });

  it('connected: the 60 s fallback; not connected: the caller’s own poll', () => {
    expect(INBOX_FALLBACK_MS).toBe(60_000);
    expect(liveInterval(true, 10_000)).toBe(60_000);
    expect(liveInterval(false, 10_000)).toBe(10_000);
    expect(liveInterval(false, 30_000)).toBe(30_000);
  });
});
