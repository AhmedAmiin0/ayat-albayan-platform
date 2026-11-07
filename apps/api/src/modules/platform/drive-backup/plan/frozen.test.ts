import { describe, expect, it } from 'vitest';
import type { ArchiveRow } from './archive.types';
import { frozenReason, frozenSince } from './frozen';
import { retireEarly } from './retention';

const row = (over: Partial<ArchiveRow>): ArchiveRow => ({
  id: 'x',
  kind: 'full',
  label: '2026-W45',
  part: 1,
  status: 'done',
  sealed: false,
  started_at: '2026-11-06T01:00:00Z',
  drive_file_id: 'f',
  ...over,
});

describe('a frozen backup (verification item 1)', () => {
  const open = [row({ id: 'p1' }), row({ id: 'p2', part: 2, started_at: '2026-11-07T01:00:00Z' })];

  it('a full open for more than 3 nights: since its first part', () => {
    expect(frozenSince(open, new Date('2026-11-10T01:00:01Z'))).toBe('2026-11-06T01:00:00Z');
    expect(frozenSince(open, new Date('2026-11-09T01:00:00Z'))).toBeNull();
  });

  it('a sealed full is never frozen', () => {
    const sealed = open.map((r) => ({ ...r, sealed: r.part === 2 }));
    expect(frozenSince(sealed, new Date('2026-11-20T01:00:00Z'))).toBeNull();
  });

  it.each([
    [{ tooLarge: 1, unread: 0, error: null }, 'too_large'],
    [{ tooLarge: 0, unread: 2, error: null }, 'unread'],
    [{ tooLarge: 1, unread: 2, error: null }, 'unread'],
    [{ tooLarge: 1, unread: 0, error: 'drive_full' }, 'drive_full'],
    [{ tooLarge: 0, unread: 0, error: 'other' }, 'failed'],
    [{ tooLarge: 0, unread: 0, error: null }, 'incomplete'],
  ] as const)('the reason: %o → %s', (outcome, reason) => {
    expect(frozenReason(outcome)).toBe(reason);
  });
});

describe('early retirement (verification item 3)', () => {
  const full = (label: string, at: string) =>
    row({ id: label, label, sealed: true, started_at: `${at}T01:00:00Z` });
  const incr = (day: string) =>
    row({ id: day, kind: 'incr', label: day, started_at: `${day}T01:00:00Z` });

  it('the oldest sealed full and the incrementals before the next one go', () => {
    const rows = [
      full('2026-W45', '2026-11-06'),
      incr('2026-11-09'),
      full('2026-W46', '2026-11-13'),
    ];
    expect(retireEarly([...rows, incr('2026-11-16')]).map((r) => r.id)).toEqual([
      '2026-W45',
      '2026-11-09',
    ]);
  });

  it('never the last sealed full', () => {
    expect(retireEarly([full('2026-W45', '2026-11-06'), incr('2026-11-09')])).toEqual([]);
  });
});
