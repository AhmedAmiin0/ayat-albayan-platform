import { describe, expect, it } from 'vitest';
import {
  clearFilterSearch,
  filterParam,
  parseFilterSearch,
  parseSortSearch,
  sortFilterParams,
  toFilterSearch,
  toSortSearch,
} from './list-search';

const KEYS = ['name', 'code'] as const;

describe('parseSortSearch', () => {
  it('keeps an allowlisted key, and dir only when desc', () => {
    expect(parseSortSearch({ sort: 'name', dir: 'desc' }, KEYS)).toEqual({ sort: 'name', dir: 'desc' });
    expect(parseSortSearch({ sort: 'name', dir: 'asc' }, KEYS)).toEqual({ sort: 'name' });
    expect(parseSortSearch({ sort: 'code', dir: 'sideways' }, KEYS)).toEqual({ sort: 'code' });
  });

  it('drops unknown keys, non-strings and a lone dir', () => {
    expect(parseSortSearch({ sort: 'password', dir: 'desc' }, KEYS)).toEqual({});
    expect(parseSortSearch({ sort: 3 }, KEYS)).toEqual({});
    expect(parseSortSearch({ dir: 'desc' }, KEYS)).toEqual({});
  });
});

describe('parseFilterSearch', () => {
  it('reads f_<key> for allowlisted keys, trimmed, non-empty strings only', () => {
    const search = { f_name: ' سهيلة ', f_code: '', f_other: 'x', name: 'y', f_x: 1 };
    expect(parseFilterSearch(search, KEYS)).toEqual({ name: 'سهيلة' });
    expect(parseFilterSearch({ f_code: 5 }, KEYS)).toEqual({});
  });

  it('names the param', () => {
    expect(filterParam('status')).toBe('f_status');
  });
});

describe('toSortSearch / toFilterSearch', () => {
  it('leaves defaults out of the URL', () => {
    expect(toSortSearch({ key: 'name', dir: 'asc' })).toEqual({ sort: 'name', dir: undefined });
    expect(toSortSearch({ key: 'name', dir: 'desc' })).toEqual({ sort: 'name', dir: 'desc' });
    expect(toSortSearch({})).toEqual({ sort: undefined, dir: undefined });
  });

  it('sets or removes one filter param', () => {
    expect(toFilterSearch('status', 'active')).toEqual({ f_status: 'active' });
    expect(toFilterSearch('status', '  ')).toEqual({ f_status: undefined });
    expect(clearFilterSearch(['status', 'name'])).toEqual({ f_status: undefined, f_name: undefined });
  });
});

describe('sortFilterParams', () => {
  it('builds API query entries', () => {
    const entries = sortFilterParams({ sort: 'name', dir: 'desc' }, { status: 'active', q: '' });
    expect(new URLSearchParams(entries).toString()).toBe('sort=name&dir=desc&status=active');
  });

  it('no sort → no sort/dir params', () => {
    expect(sortFilterParams({ dir: 'desc' })).toEqual([]);
    expect(sortFilterParams({ sort: 'code' })).toEqual([['sort', 'code']]);
  });
});
