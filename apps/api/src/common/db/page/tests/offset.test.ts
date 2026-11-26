import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import type { SortSpec } from '@/common/db/list-sort';
import { pageWindow, readPage, toPage } from '@/common/db/page';

const SORT: SortSpec<'name'> = {
  columns: { name: { column: 'name' } },
  fallback: [{ column: 'created_at', ascending: false }],
};
const T = 'leads';

function read(results: Parameters<typeof fakeDb>[0], input = { page: 2, pageSize: 10 }) {
  const fake = fakeDb(results);
  const query = () => fake.db.from(T).select('id', { count: 'exact' });
  return { fake, done: readPage(query, input, SORT) };
}

describe('pageWindow', () => {
  it('turns a 1-based page into an inclusive row window', () => {
    expect(pageWindow({ page: 1, pageSize: 25 })).toEqual({ from: 0, to: 24 });
    expect(pageWindow({ page: 3, pageSize: 10 })).toEqual({ from: 20, to: 29 });
  });
});

describe('toPage', () => {
  it('wraps rows read another way in the Page envelope', () => {
    expect(toPage(['a'], 11, { page: 2, pageSize: 10 })).toEqual({
      items: ['a'],
      total: 11,
      page: 2,
      pageSize: 10,
    });
  });
});

describe('readPage', () => {
  it('sorts, reads the window and returns the rows with the exact count', async () => {
    const { fake, done } = read({ [T]: [{ data: [{ id: 'a' }], count: 11 }] });
    expect(await done).toEqual({ rows: [{ id: 'a' }], total: 11 });
    expect(fake.argsOf(T, 'range')).toEqual([10, 19]);
    expect(fake.calls.filter((c) => c.method === 'order').map((c) => c.args)).toEqual([
      ['created_at', { ascending: false }],
      ['id', { ascending: true }],
    ]);
  });

  it('past the end: an empty page and the real total, from one count read', async () => {
    const pastEnd = { code: 'PGRST103', message: 'Requested range not satisfiable' };
    const { fake, done } = read({ [T]: [{ error: pastEnd }, { data: [{ id: 'a' }], count: 4 }] });
    expect(await done).toEqual({ rows: [], total: 4 });
    expect(fake.trips).toEqual([T, T]);
    expect(fake.calls.filter((c) => c.method === 'range').map((c) => c.args)).toEqual([
      [10, 19],
      [0, 0],
    ]);
  });

  it('a missing count reads as zero', async () => {
    const { done } = read({ [T]: [{ data: [], count: null }] });
    expect(await done).toEqual({ rows: [], total: 0 });
  });

  it('any other error throws its mapped answer', async () => {
    const { done } = read({ [T]: [{ error: { code: '42P01', message: 'missing' } }] });
    await expect(done).rejects.toThrow('missing');
  });
});
