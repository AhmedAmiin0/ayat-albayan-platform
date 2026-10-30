import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearOwnSends, lastOwnSend, ownSendGeneration, recordOwnSend, subscribeOwnSends } from './own-send';

const A = '+966501234567';
const B = '+966507654321';

afterEach(clearOwnSends);

describe('her own last send per chat', () => {
  it('records the newest id per phone', () => {
    recordOwnSend(A, 'm-1');
    recordOwnSend(A, 'm-2');
    recordOwnSend(B, 'm-3');
    expect(lastOwnSend(A)).toBe('m-2');
    expect(lastOwnSend(B)).toBe('m-3');
  });

  it('clearOwnSends forgets every chat', () => {
    recordOwnSend(A, 'm-1');
    clearOwnSends();
    expect(lastOwnSend(A)).toBeUndefined();
  });

  it('a send started before a sign-out records nothing after it (round 2 D)', () => {
    const before = ownSendGeneration();
    clearOwnSends();
    recordOwnSend(A, 'm-old', before);
    expect(lastOwnSend(A)).toBeUndefined();
    recordOwnSend(A, 'm-new', ownSendGeneration());
    expect(lastOwnSend(A)).toBe('m-new');
  });

  it('notifies subscribers on a record and on a clear, not on a stale record; unsubscribe stops it', () => {
    const listener = vi.fn();
    const stop = subscribeOwnSends(listener);
    const before = ownSendGeneration();
    recordOwnSend(A, 'm-1');
    clearOwnSends();
    recordOwnSend(A, 'm-old', before);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    recordOwnSend(A, 'm-2');
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
