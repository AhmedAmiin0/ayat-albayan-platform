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
});

describe('isAwaitingReply', () => {
  it('only a queued row marked awaiting_reply', () => {
    expect(isAwaitingReply({ status: 'queued', error_code: 'awaiting_reply' })).toBe(true);
    expect(isAwaitingReply({ status: 'failed', error_code: 'awaiting_reply' })).toBe(false);
    expect(isAwaitingReply({ status: 'queued', error_code: null })).toBe(false);
    expect(isAwaitingReply({ status: 'queued', error_code: 'hold_expired' })).toBe(false);
  });
});
