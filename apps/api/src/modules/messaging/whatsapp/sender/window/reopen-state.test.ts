import { describe, expect, it } from 'vitest';
import { nextReopenKey, orphaned, reopenLive, reopenRequested } from './reopen-state';
import { NOW, PHONE, reopenOf } from './window.fakes';

// Which reopen template rows count (merge-gate review 2026-11-05). Pure.

const DAY = `reopen:${PHONE}:2026-11-03`;

describe('reopenLive / reopenRequested', () => {
  it.each([
    ['sent', { status: 'sent' as const }, true],
    ['delivered', { status: 'delivered' as const }, true],
    ['read', { status: 'read' as const }, true],
    ['queued, not past its expiry', { status: 'queued' as const }, true],
    ['queued, no expiry (an older open)', { status: 'queued' as const, expires_at: null }, true],
    ['queued past its expiry', { status: 'queued' as const, expires_at: '2026-11-03T07:59:59Z' }, false],
    ['failed', { status: 'failed' as const }, false],
    ['failed uncertain (may have gone out)', { status: 'failed' as const, error_code: 'uncertain' }, true],
  ])('%s → live %s', (_name, over, live) => {
    expect(reopenLive(reopenOf(over), NOW)).toBe(live);
  });

  it('none, or only dead ones: not requested', () => {
    expect(reopenRequested([], NOW)).toBe(false);
    expect(reopenRequested([reopenOf({ status: 'failed' })], NOW)).toBe(false);
    expect(reopenRequested([reopenOf({ status: 'failed' }), reopenOf()], NOW)).toBe(true);
  });
});

describe('nextReopenKey', () => {
  it('the day key first, then :2 and :3, then none (no fourth call today)', () => {
    const failed = (k: string) => reopenOf({ status: 'failed', dedup_key: k });
    expect(nextReopenKey(PHONE, [], NOW)).toBe(DAY);
    expect(nextReopenKey(PHONE, [failed(DAY)], NOW)).toBe(`${DAY}:2`);
    expect(nextReopenKey(PHONE, [failed(DAY), failed(`${DAY}:2`)], NOW)).toBe(`${DAY}:3`);
    expect(nextReopenKey(PHONE, [DAY, `${DAY}:2`, `${DAY}:3`].map(failed), NOW)).toBeNull();
  });

  it("yesterday's rows (still within 24 h) do not use today's tries", () => {
    const yesterday = reopenOf({ status: 'failed', dedup_key: `reopen:${PHONE}:2026-11-02` });
    expect(nextReopenKey(PHONE, [yesterday], NOW)).toBe(DAY);
  });
});

describe('orphaned', () => {
  const held = (id: string, at: string | null) => ({ id, phone_e164: PHONE, scheduled_for: at });

  it('a held text whose reopen failed or expired unsent: orphaned; one with a live reopen: not', () => {
    const since = '2026-11-03T07:10:00Z';
    expect(orphaned([held('h1', since)], [reopenOf({ status: 'failed' })], NOW)).toEqual(['h1']);
    expect(orphaned([held('h1', since)], [reopenOf()], NOW)).toEqual([]);
    expect(orphaned([held('h1', since)], [], NOW)).toEqual(['h1']);
  });

  it("a reopen made more than 24 h before the hold, or another phone's, does not serve it", () => {
    const old = reopenOf({ created_at: '2026-11-02T06:00:00Z' });
    expect(orphaned([held('h1', '2026-11-03T07:10:00Z')], [old], NOW)).toEqual(['h1']);
    const other = reopenOf({ phone_e164: '+966500000009' });
    expect(orphaned([held('h1', '2026-11-03T07:10:00Z')], [other], NOW)).toEqual(['h1']);
  });

  it('a row not held yet (no hold start): never orphaned', () => {
    expect(orphaned([held('q1', null)], [], NOW)).toEqual([]);
  });
});
