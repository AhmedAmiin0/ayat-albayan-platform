import { describe, expect, it } from 'vitest';
import { parseStudentsSearch } from './search';

describe('parseStudentsSearch (R-NFR-08)', () => {
  it('keeps a search term and a page above 1', () => {
    expect(parseStudentsSearch({ search: 'سهيلة', page: '3' })).toEqual({ search: 'سهيلة', page: 3 });
  });

  it('drops defaults and junk: empty search, page 1, non-numbers', () => {
    expect(parseStudentsSearch({ search: '', page: '1' })).toEqual({ search: undefined, page: undefined });
    expect(parseStudentsSearch({ search: 5, page: 'x' })).toEqual({ search: undefined, page: undefined });
  });

  it('floors a fractional page', () => {
    expect(parseStudentsSearch({ page: 2.7 }).page).toBe(2);
  });
});
