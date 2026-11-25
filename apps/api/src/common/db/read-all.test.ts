import type { PostgrestError } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { IN_CHUNK, MAX_ROWS, readAll, readChunked, readChunkedAll } from './read-all';

describe('readAll — never truncated at PostgREST max_rows', () => {
  it('keeps reading ranges until a short page', async () => {
    const total = MAX_ROWS * 2 + 5;
    const ranges: [number, number][] = [];
    const rows = await readAll(async (from, to) => {
      ranges.push([from, to]);
      const data = Array.from(
        { length: Math.max(0, Math.min(to, total - 1) - from + 1) },
        (_, i) => from + i,
      );
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
    expect(await readAll(async () => ((calls += 1), { data: [1, 2], error: null }))).toEqual([
      1, 2,
    ]);
    expect(calls).toBe(1);
    await expect(
      readAll(async () => ({
        data: null,
        error: { code: 'XX000', message: 'boom', details: '', hint: '', name: 'PostgrestError' } as PostgrestError,
      })),
    ).rejects.toThrow(/boom/);
  });
});

describe('readChunked — long .in() lists never hit HTTP 414', () => {
  it('reads IN_CHUNK ids per request, in order; nothing to read → no request', async () => {
    const ids = Array.from({ length: IN_CHUNK * 2 + 3 }, (_, i) => `id${i}`);
    const sizes: number[] = [];
    const rows = await readChunked(
      ids,
      async (chunk) => (sizes.push(chunk.length), { data: chunk, error: null }),
    );
    expect(sizes).toEqual([IN_CHUNK, IN_CHUNK, 3]);
    expect(rows).toEqual(ids);
    expect(await readChunked([], async () => ({ data: ['x'], error: null }))).toEqual([]);
  });
});

const rowsOf = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('readChunkedAll — a chunk with more than max_rows rows is never cut', () => {
  it('pages each chunk until a short page, chunks in order', async () => {
    const ids = Array.from({ length: IN_CHUNK + 1 }, (_, i) => `id${i}`);
    const perChunk = new Map([[IN_CHUNK, MAX_ROWS + 7], [1, 3]]);
    const calls: [number, number, number][] = [];
    const rows = await readChunkedAll(ids, async (chunk, from, to) => {
      calls.push([chunk.length, from, to]);
      const total = perChunk.get(chunk.length) ?? 0;
      return { data: rowsOf(total).slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(MAX_ROWS + 7 + 3);
    expect(calls).toEqual([
      [IN_CHUNK, 0, MAX_ROWS - 1],
      [IN_CHUNK, MAX_ROWS, MAX_ROWS * 2 - 1],
      [1, 0, MAX_ROWS - 1],
    ]);
  });

  it('nothing to read → no request', async () => {
    let calls = 0;
    const rows = await readChunkedAll([], async () => ((calls += 1), { data: [1], error: null }));
    expect(rows).toEqual([]);
    expect(calls).toBe(0);
  });
});
