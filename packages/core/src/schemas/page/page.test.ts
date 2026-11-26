import { pageGoldenCases, pageOutcome } from '@ab/testing/page-golden';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { listSortShape } from '../list-sort';
import { MAX_PAGE, pageOf, pageQuery } from './page.schemas';
import { pageWindow } from './page-window';

const query = z.object({ ...pageQuery({ size: 25 }), ...listSortShape(['name'] as const) });

describe('pageQuery', () => {
  it('fills page 1 and the endpoint default size', () => {
    expect(query.parse({})).toEqual({ page: 1, pageSize: 25 });
  });

  it('coerces the query strings', () => {
    expect(query.parse({ page: '3', pageSize: '10', sort: 'name' })).toEqual({
      page: 3,
      pageSize: 10,
      sort: 'name',
    });
  });

  it.each([{ page: '0' }, { page: '1.5' }, { pageSize: '0' }, { pageSize: '101' }])(
    'rejects %o',
    (input) => {
      expect(query.safeParse(input).success).toBe(false);
    },
  );

  it('takes the endpoint maximum', () => {
    const small = z.object(pageQuery({ size: 20, max: 50 }));
    expect(small.safeParse({ pageSize: '50' }).success).toBe(true);
    expect(small.safeParse({ pageSize: '51' }).success).toBe(false);
  });

  it('stops at MAX_PAGE unless the endpoint sets a lower last page', () => {
    expect(MAX_PAGE).toBe(10_000);
    expect(query.parse({ page: '10000' }).page).toBe(10_000);
    expect(query.safeParse({ page: '10001' }).success).toBe(false);
    const short = z.object(pageQuery({ size: 20, lastPage: 50 }));
    expect(short.safeParse({ page: '50' }).success).toBe(true);
    expect(short.safeParse({ page: '51' }).success).toBe(false);
  });
});

describe('pageQuery golden cases', () => {
  const small = z.object(pageQuery({ size: 20, max: 50 }));

  it.each(pageGoldenCases({ size: 20, max: 50 }))('answers $input', ({ input, expected }) => {
    expect(pageOutcome(small, input)).toEqual(expected);
  });
});

describe('pageOf', () => {
  const page = pageOf(z.object({ id: z.string() }));

  it('parses the Page envelope', () => {
    const body = { items: [{ id: 'a' }], total: 1, page: 1, pageSize: 25 };
    expect(page.parse(body)).toEqual(body);
  });

  it('rejects a bad item or a fractional count', () => {
    expect(page.safeParse({ items: [{}], total: 1, page: 1, pageSize: 25 }).success).toBe(false);
    expect(page.safeParse({ items: [], total: 1.5, page: 1, pageSize: 25 }).success).toBe(false);
  });

  it('strips keys the client does not know, so an older client reads a newer server', () => {
    const body = { items: [], total: 0, page: 1, pageSize: 25, cursor: 'x' };
    expect(page.parse(body)).toEqual({ items: [], total: 0, page: 1, pageSize: 25 });
  });
});

describe('pageWindow', () => {
  it('turns a 1-based page into an inclusive row window', () => {
    expect(pageWindow({ page: 1, pageSize: 25 })).toEqual({ from: 0, to: 24 });
    expect(pageWindow({ page: 3, pageSize: 10 })).toEqual({ from: 20, to: 29 });
  });
});
