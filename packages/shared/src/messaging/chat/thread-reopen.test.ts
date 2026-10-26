import { describe, expect, it } from 'vitest';
import { reopenDedupKey } from './thread-reopen.js';

describe('reopenDedupKey', () => {
  it('names the phone and the Asia/Riyadh day', () => {
    expect(reopenDedupKey('+201000000001', new Date('2026-10-26T10:00:00Z'))).toBe('reopen:+201000000001:2026-10-26');
  });

  it('turns over at Riyadh midnight (21:00 UTC), not UTC midnight', () => {
    expect(reopenDedupKey('+201000000001', new Date('2026-10-26T20:59:00Z'))).toBe('reopen:+201000000001:2026-10-26');
    expect(reopenDedupKey('+201000000001', new Date('2026-10-26T21:00:00Z'))).toBe('reopen:+201000000001:2026-10-27');
  });
});
