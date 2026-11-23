import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { listSortShape, SORT_DIRS } from './list-sort.js';

const schema = z.object({ page: z.coerce.number().default(1), ...listSortShape(['name', 'code'] as const) });

describe('listSortShape', () => {
  it('accepts an allowlisted key and dir', () => {
    expect(schema.parse({ sort: 'code', dir: 'desc' })).toEqual({ page: 1, sort: 'code', dir: 'desc' });
  });

  it('leaves both out when absent (the endpoint default order)', () => {
    expect(schema.parse({})).toEqual({ page: 1 });
  });

  it('rejects an unknown key or dir', () => {
    expect(schema.safeParse({ sort: 'password' }).success).toBe(false);
    expect(schema.safeParse({ sort: 'name', dir: 'up' }).success).toBe(false);
  });

  it('exposes the two directions', () => {
    expect(SORT_DIRS).toEqual(['asc', 'desc']);
  });
});
