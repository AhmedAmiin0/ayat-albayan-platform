import { describe, expect, it } from 'vitest';
import { IN_CHUNK, MAX_ROWS, readChunkedAll } from './read-all';

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
