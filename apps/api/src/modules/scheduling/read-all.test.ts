import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { MAX_ROWS, readAll } from './read-all';

describe('readAll — never truncated at PostgREST max_rows', () => {
  it('keeps reading ranges until a short page', async () => {
    const total = MAX_ROWS * 2 + 5;
    const ranges: [number, number][] = [];
    const rows = await readAll(async (from, to) => {
      ranges.push([from, to]);
      const data = Array.from({ length: Math.max(0, Math.min(to, total - 1) - from + 1) }, (_, i) => from + i);
      return { data, error: null };
    });
    expect(rows).toHaveLength(total);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('stops after one call for a short list, and throws on an error', async () => {
    let calls = 0;
    expect(await readAll(async () => ((calls += 1), { data: [1, 2], error: null }))).toEqual([1, 2]);
    expect(calls).toBe(1);
    await expect(
      readAll(async () => ({
        data: null,
        error: { code: 'XX000', message: 'boom', details: '', hint: '', name: 'PostgrestError' } as PostgrestError,
      })),
    ).rejects.toThrow(/boom/);
  });
});
