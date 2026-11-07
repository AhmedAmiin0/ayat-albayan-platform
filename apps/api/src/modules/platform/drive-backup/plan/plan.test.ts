import { describe, expect, it } from 'vitest';
import type { ArchiveRow } from './archive.types';
import { decide } from './decide';
import { isPending, planParts } from './parts';
import { toTrash } from './retention';

const row = (over: Partial<ArchiveRow>): ArchiveRow => ({
  id: over.label ?? 'x',
  kind: 'full',
  label: '2026-W45',
  part: 1,
  status: 'done',
  sealed: true,
  started_at: '2026-11-07T01:00:00Z',
  drive_file_id: 'f',
  ...over,
});
const o = (key: string, size: number) => ({ bucket: 'reports' as const, key, etag: key, size });

describe('decide', () => {
  it('no history: a full of this week', () => {
    expect(decide([], new Date('2026-11-10T01:00:00Z'))).toMatchObject({
      kind: 'full',
      label: '2026-W46',
      firstPart: 1,
    });
  });

  it('a stale base (two weeks old) starts a full even on a Monday', () => {
    const plan = decide(
      [row({ label: '2026-W44', started_at: '2026-10-30T01:00:00Z' })],
      new Date('2026-11-09T01:00:00Z'),
    );
    expect(plan).toMatchObject({ kind: 'full', label: '2026-W46' });
  });

  it('a failed part keeps its number: the next part goes after it', () => {
    const rows = [
      row({ sealed: false }),
      row({ id: 'p2', part: 2, status: 'failed', sealed: false }),
    ];
    expect(decide(rows, new Date('2026-11-08T01:00:00Z'))).toMatchObject({
      kind: 'full',
      firstPart: 3,
    });
  });

  it('an incremental builds on the sealed full and the incrementals after it only', () => {
    const rows = [
      row({
        id: 'old-incr',
        kind: 'incr',
        label: '2026-11-06',
        started_at: '2026-11-06T01:00:00Z',
        sealed: false,
      }),
      row({ id: 'full' }),
      row({
        id: 'incr',
        kind: 'incr',
        label: '2026-11-08',
        started_at: '2026-11-08T01:00:00Z',
        sealed: false,
      }),
    ];
    const plan = decide(rows, new Date('2026-11-09T01:00:00Z'));
    expect(plan.kind).toBe('incr');
    expect(plan.base.map((r) => r.id)).toEqual(['full', 'incr']);
  });
});

describe('parts and pending', () => {
  it('part and run caps, in order; one big object always fits', () => {
    expect(
      planParts([o('a', 6), o('b', 6), o('c', 6)], { part: 10, run: 100 }).parts.map(
        (p) => p.length,
      ),
    ).toEqual([1, 1, 1]);
    expect(planParts([o('a', 4), o('b', 4), o('c', 4)], { part: 10, run: 9 })).toMatchObject({
      left: 1,
    });
    expect(planParts([o('huge', 500)], { part: 10, run: 10 }).parts).toEqual([[o('huge', 500)]]);
  });

  it('pending = not covered with the same ETag', () => {
    const covered = new Map([['reports/a', 'a']]);
    expect(isPending(covered, o('a', 1))).toBe(false);
    expect(isPending(covered, { ...o('a', 1), etag: 'changed' })).toBe(true);
    expect(isPending(covered, o('b', 1))).toBe(true);
  });
});

describe('retention', () => {
  const week = (n: number) => `2026-W${String(40 + n).padStart(2, '0')}`;
  const at = (n: number) => new Date(Date.UTC(2026, 9, 2 + n * 7)).toISOString();
  const fulls = (n: number) =>
    Array.from({ length: n }, (_, i) => row({ id: `f${i}`, label: week(i), started_at: at(i) }));

  it('nothing while 4 or fewer fulls are sealed', () => {
    expect(toTrash(fulls(4))).toEqual([]);
  });

  it('the 5th full trashes the oldest full and the incrementals before the new oldest', () => {
    const incr = row({
      id: 'i1',
      kind: 'incr',
      label: '2026-10-05',
      started_at: '2026-10-05T01:00:00Z',
      sealed: false,
    });
    const kept = row({
      id: 'i2',
      kind: 'incr',
      label: '2026-10-17',
      started_at: '2026-10-17T01:00:00Z',
      sealed: false,
    });
    expect(
      toTrash([...fulls(5), incr, kept])
        .map((r) => r.id)
        .sort(),
    ).toEqual(['f0', 'i1']);
  });
});
