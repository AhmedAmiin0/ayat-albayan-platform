import type { Page } from '@ab/core';
import { expect, test } from 'vitest';
import { flattenPages, nextPageParam } from '../paging';

const page = <T>(items: T[], n: number, total: number): Page<T> => ({
  items,
  total,
  page: n,
  pageSize: 2,
});

test('next page only while rows remain', () => {
  expect(nextPageParam(page([{}, {}], 1, 5))).toBe(2);
  expect(nextPageParam(page([{}, {}], 2, 5))).toBe(3);
  expect(nextPageParam(page([{}], 3, 5))).toBeUndefined();
  expect(nextPageParam(page([], 1, 0))).toBeUndefined();
});

test('flattenPages keeps order and drops a row repeated by an insert mid-scroll', () => {
  const pages = [page([{ id: 'a' }, { id: 'b' }], 1, 4), page([{ id: 'b' }, { id: 'c' }], 2, 4)];
  expect(flattenPages(pages).map((r) => r.id)).toEqual(['a', 'b', 'c']);
});
