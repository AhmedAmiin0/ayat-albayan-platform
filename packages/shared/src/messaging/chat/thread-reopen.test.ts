import { describe, expect, it } from 'vitest';
import { isAwaitingReply, reopenDedupKey } from './thread-reopen.js';

describe('reopenDedupKey', () => {
  it('names the phone and the Asia/Riyadh day', () => {
    expect(reopenDedupKey('+201000000001', new Date('2026-10-26T10:00:00Z'))).toBe('reopen:+201000000001:2026-10-26');
  });

  it('turns over at Riyadh midnight (21:00 UTC), not UTC midnight', () => {
    expect(reopenDedupKey('+201000000001', new Date('2026-10-26T20:59:00Z'))).toBe('reopen:+201000000001:2026-10-26');
    expect(reopenDedupKey('+201000000001', new Date('2026-10-26T21:00:00Z'))).toBe('reopen:+201000000001:2026-10-27');
  });

  it('a later try the same day gets its own key (the first failed): one per try, still per day', () => {
    const at = new Date('2026-10-26T10:00:00Z');
    expect(reopenDedupKey('+201000000001', at, 1)).toBe('reopen:+201000000001:2026-10-26');
    expect(reopenDedupKey('+201000000001', at, 2)).toBe('reopen:+201000000001:2026-10-26:2');
  });
});

describe('isAwaitingReply', () => {
  it('only a queued row marked awaiting_reply', () => {
    expect(isAwaitingReply({ status: 'queued', error_code: 'awaiting_reply' })).toBe(true);
    expect(isAwaitingReply({ status: 'failed', error_code: 'awaiting_reply' })).toBe(false);
    expect(isAwaitingReply({ status: 'queued', error_code: null })).toBe(false);
    expect(isAwaitingReply({ status: 'queued', error_code: 'hold_expired' })).toBe(false);
  });
});
