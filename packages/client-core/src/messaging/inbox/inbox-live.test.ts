import { describe, expect, it } from 'vitest';
import { THREAD_FULL_MS } from '../channels/channels.js';
import {
  changedPhone,
  chatLiveKey,
  fullReadInterval,
  INBOX_FALLBACK_MS,
  liveInterval,
  refreshPlan,
  THREAD_FULL_LIVE_MS,
  throttleMsOf,
} from './inbox-live.js';

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

  it('the chat owns the badge: the list and that chat only (docs/43 AU6)', () => {
    expect(refreshPlan('+966500000001', true)).toEqual(['list', chatLiveKey('+966500000001')]);
  });

  it('connected: the whole page every 5 min; not connected: every THREAD_FULL_MS (docs/43 AU5)', () => {
    expect(THREAD_FULL_LIVE_MS).toBe(300_000);
    expect(fullReadInterval(true)).toBe(THREAD_FULL_LIVE_MS);
    expect(fullReadInterval(false)).toBe(THREAD_FULL_MS);
  });

  it('a chat waits 1 s between fetches, the list and the badge 3 s', () => {
    expect(throttleMsOf(chatLiveKey('+966500000001'))).toBe(1_000);
    expect(throttleMsOf('list')).toBe(3_000);
    expect(throttleMsOf('badge')).toBe(3_000);
  });

  it('connected: the 20 s safety net; not connected: the caller’s own poll', () => {
    expect(INBOX_FALLBACK_MS).toBe(20_000);
    expect(liveInterval(true, 10_000)).toBe(20_000);
    expect(liveInterval(false, 10_000)).toBe(10_000);
    expect(liveInterval(false, 30_000)).toBe(30_000);
  });
});
