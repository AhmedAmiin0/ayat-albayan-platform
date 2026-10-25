import { afterEach, describe, expect, it } from 'vitest';
import { clearOwnSends, lastOwnSend, ownSendGeneration, recordOwnSend } from './own-send';

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
});
