import { describe, expect, it } from 'vitest';
import { BUCKETS } from '@/common/storage/storage.paths';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import { partCost } from './cost';
import { DEFAULT_CAPS, planParts } from './parts';

// Round 3, item 2: an object above the night's cap is never starved by the smaller ones before it.

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
  it('goes first, alone, when it fits the room; the small ones wait one night', () => {
    const plan = planParts([...day, o('rec', 5 * GB)], DEFAULT_CAPS, 20 * GB);
    expect(keys(plan.parts)).toEqual([['rec']]);
    expect(plan.left.map((x) => x.key)).toEqual(day.map((x) => x.key));
    expect(plan.tooLarge).toEqual([]);
  });

  it('larger than the room: too large (named), the rest still goes', () => {
    const plan = planParts([...day.slice(0, 2), o('rec', 5 * GB)], DEFAULT_CAPS, 4.5 * GB);
    expect(plan.tooLarge.map((x) => x.key)).toEqual(['rec']);
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

  it('two recordings above the cap: one per night, the other left (not too large)', () => {
    const plan = planParts([o('rec-a', 5 * GB), o('rec-b', 5 * GB)], DEFAULT_CAPS);
    expect(keys(plan.parts)).toEqual([['rec-a']]);
    expect(plan.left.map((x) => x.key)).toEqual(['rec-b']);
  });
});
