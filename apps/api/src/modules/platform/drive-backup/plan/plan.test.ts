import { describe, expect, it } from 'vitest';
import type { ArchiveRow } from './archive.types';
import { decide } from './decide';
import { partCost } from './cost';
import { type Caps, DEFAULT_CAPS, isPending, planParts } from './parts';
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
const MB = 1024 ** 2;
const GB = 1024 ** 3;
const o = (key: string, size: number) => ({ bucket: 'reports' as const, key, etag: key, size });

describe('decide', () => {
  it('no history: a full of this week', () => {
    expect(decide([], new Date('2026-11-10T01:00:00Z'))).toMatchObject({
      kind: 'full',
      label: '2026-W46',
    });
  });

  it('a stale base (two weeks old) starts a full even on a Monday', () => {
    const plan = decide(
      [row({ label: '2026-W44', started_at: '2026-10-30T01:00:00Z' })],
      new Date('2026-11-09T01:00:00Z'),
    );
    expect(plan).toMatchObject({ kind: 'full', label: '2026-W46' });
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
  it('part and run caps (costs, overheads counted), in order; one big object always fits', () => {
    const three = [o('a', MB), o('b', MB), o('c', MB)];
    const lengths = (caps: Caps) => planParts(three, caps).parts.map((p) => p.length);
    expect(lengths({ part: partCost([o('a', MB)]), run: GB })).toEqual([1, 1, 1]);
    expect(lengths({ part: partCost(three.slice(0, 2)), run: GB })).toEqual([2, 1]);
    const one = partCost([o('a', MB)]);
    expect(planParts(three, { part: one, run: 2 * one }).left).toHaveLength(1);
    const huge = planParts([o('huge', GB)], { part: MB, run: MB });
    expect(huge.parts).toEqual([]);
    expect(huge.tooLarge).toEqual([{ object: o('huge', GB), why: 'night' }]);
  });

  it('an object larger than the room is skipped; the later ones still go (no freeze)', () => {
    const todo = [o('big', 2 * GB), o('a', MB), o('b', MB)];
    const plan = planParts(todo, DEFAULT_CAPS, GB);
    expect(plan.tooLarge).toEqual([{ object: o('big', 2 * GB), why: 'room' }]);
    expect(plan.parts).toEqual([[o('a', MB), o('b', MB)]]);
    expect(plan.left).toEqual([]);
  });

  it('every part planned fits the room it was planned for', () => {
    const todo = Array.from({ length: 50 }, (_, i) => o(`k${i}`, 30 * MB));
    const room = 400 * MB;
    const plan = planParts(todo, DEFAULT_CAPS, room);
    expect(plan.parts.every((p) => partCost(p) <= room)).toBe(true);
    expect(plan.parts.reduce((n, p) => n + partCost(p), 0)).toBeLessThanOrEqual(room);
    expect(plan.left.length).toBeGreaterThan(0);
  });

  it('the cost charges the tar and zstd overhead, never just the raw bytes', () => {
    expect(partCost([o('a', GB)])).toBeGreaterThan(GB + 1024 * 1024);
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
