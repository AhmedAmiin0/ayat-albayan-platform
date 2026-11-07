import { describe, expect, it } from 'vitest';
import { BUCKETS } from '@/common/storage/storage.paths';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import { partCost } from './cost';
import { DEFAULT_CAPS, planParts } from './parts';

// Round 4, item 1: a part above the night's cap is too large (never sent, named), like one above
// the room; every other part still goes the same night.

const MB = 1024 ** 2;
const GB = 1024 ** 3;
const o = (key: string, size: number): ListedObject => ({
  bucket: BUCKETS.recordings,
  key,
  etag: key,
  size,
});
const keys = (parts: readonly ListedObject[][]) => parts.map((p) => p.map((x) => x.key));
const day = Array.from({ length: 6 }, (_, i) => o(`new-${i}`, 900 * MB));

describe('the night cap and a recording larger than it', () => {
  it('fits the room but not the cap: too large («night»); the small ones go tonight', () => {
    const rec = o('rec', 5 * GB);
    const plan = planParts([rec, ...day], DEFAULT_CAPS, 20 * GB);
    expect(plan.tooLarge).toEqual([{ object: rec, why: 'night' }]);
    expect(keys(plan.parts)).toEqual([['new-0'], ['new-1'], ['new-2'], ['new-3']]);
    expect(plan.left.map((x) => x.key)).toEqual(['new-4', 'new-5']);
  });

  it('larger than the room: too large («room»), the rest still goes', () => {
    const plan = planParts([...day.slice(0, 2), o('rec', 5 * GB)], DEFAULT_CAPS, 4.5 * GB);
    expect(plan.tooLarge.map((x) => [x.object.key, x.why])).toEqual([['rec', 'room']]);
    expect(keys(plan.parts)).toEqual([['new-0'], ['new-1']]);
  });

  it('a part over what is left of the cap is passed over; smaller ones after it still go', () => {
    const small = o('small', MB);
    const plan = planParts([...day.slice(0, 4), o('mid', 900 * MB), small], DEFAULT_CAPS);
    expect(plan.left.map((x) => x.key)).toEqual(['mid']);
    expect(keys(plan.parts).flat()).toContain('small');
    const spent = plan.parts.reduce((n, p) => n + partCost(p), 0);
    expect(spent).toBeLessThanOrEqual(DEFAULT_CAPS.run);
  });

  it('two recordings above the cap: both too large, none left, none sent', () => {
    const plan = planParts([o('rec-a', 5 * GB), o('rec-b', 5 * GB)], DEFAULT_CAPS);
    expect(plan.parts).toEqual([]);
    expect(plan.left).toEqual([]);
    expect(plan.tooLarge.map((x) => x.why)).toEqual(['night', 'night']);
  });

  it('no part planned is above the night cap', () => {
    const todo = [o('a', 3 * GB), o('b', 5 * GB), ...day, o('c', 4 * GB)];
    const plan = planParts(todo, DEFAULT_CAPS);
    expect(plan.parts.every((p) => partCost(p) <= DEFAULT_CAPS.run)).toBe(true);
    expect(plan.tooLarge.map((x) => x.object.key)).toEqual(['b', 'c']);
  });
});
