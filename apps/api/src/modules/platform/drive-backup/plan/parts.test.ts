import { describe, expect, it } from 'vitest';
import type { ListedObject } from '@/modules/platform/drive-backup/source/backup-source.port';
import { partCost } from './cost';
import { isPending, planParts, STREAMED_MIN, versionId } from './parts';

const o = (key: string, size = 10, etag = 'e1'): ListedObject => ({
  bucket: 'reports',
  key,
  etag,
  size,
});

describe('planParts', () => {
  it('splits in order under the part cap; a big streamed object gets its own part', () => {
    const big = o('big', STREAMED_MIN + 1);
    const plan = planParts([o('a'), o('b'), big, o('c')], { part: 1024 ** 3 });
    expect(plan.parts.map((p) => p.map((x) => x.key))).toEqual([['a', 'b'], ['big'], ['c']]);
    expect(plan.tooLarge).toEqual([]);
  });

  it('above the part cap: too large (named), the others still planned', () => {
    const cap = partCost([o('a'), o('b')]);
    const plan = planParts([o('a'), o('huge', cap), o('b')], { part: cap });
    expect(plan.tooLarge.map((x) => x.key)).toEqual(['huge']);
    expect(plan.parts.map((p) => p.map((x) => x.key))).toEqual([['a', 'b']]);
  });

  it('a smaller room splits finer, never marks an object too large', () => {
    const room = partCost([o('a')]);
    const plan = planParts([o('a'), o('b')], { part: 1024 ** 3 }, room);
    expect(plan.parts).toHaveLength(2);
    expect(plan.tooLarge).toEqual([]);
  });
});

describe('isPending: one recorded version per (bucket, key, ETag)', () => {
  it('a new ETag of a recorded key is pending again; the same one never', () => {
    const covered = new Set([versionId(o('a'))]);
    expect(isPending(covered, o('a'))).toBe(false);
    expect(isPending(covered, o('a', 10, 'e2'))).toBe(true);
    expect(isPending(covered, o('b'))).toBe(true);
  });
});
