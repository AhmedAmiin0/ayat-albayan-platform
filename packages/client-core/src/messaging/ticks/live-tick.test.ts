import type { MessageStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { liveTick } from './live-tick.js';

// docs/44 K1 (round 4): a live patch over a synced store moves a tick forward only; it never
// takes a row onto or off failed / sent_manually unless the event is newer than the row's stamp.

const STAMP = '2026-11-07T10:00:05.123456+00:00';
const OLD = '2026-11-07T10:00:00Z';
const NEW = '2026-11-07T10:00:09Z';

describe('liveTick', () => {
  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    ['queued', 'sent', 'sent'],
    ['sent', 'delivered', 'delivered'],
    ['delivered', 'read', 'read'],
    ['read', 'delivered', 'read'],
    ['sent', 'queued', 'sent'],
    ['failed', 'sent', 'failed'],
    ['failed', 'queued', 'failed'],
    ['sent_manually', 'read', 'sent_manually'],
  ])('stored %s, event %s (any time) → %s', (status, s, shown) => {
    expect(liveTick({ status, stamp: STAMP }, { s, at: NEW })).toBe(shown);
  });

  it.each<{ status: MessageStatus; s: MessageStatus; at: string; shown: MessageStatus }>([
    { status: 'sent', s: 'failed', at: NEW, shown: 'failed' },
    { status: 'sent', s: 'failed', at: OLD, shown: 'sent' },
    { status: 'failed', s: 'sent_manually', at: NEW, shown: 'sent_manually' },
    { status: 'failed', s: 'sent_manually', at: OLD, shown: 'failed' },
  ])('stored $status, event $s at $at → $shown', ({ status, s, at, shown }) => {
    expect(liveTick({ status, stamp: STAMP }, { s, at })).toBe(shown);
  });

  it('with no stamp (no stored row) only a forward move lands', () => {
    expect(liveTick({ status: 'sent' }, { s: 'failed', at: NEW })).toBe('sent');
    expect(liveTick({ status: 'sent' }, { s: 'read', at: NEW })).toBe('read');
  });
});
