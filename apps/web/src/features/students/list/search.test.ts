import { describe, expect, it } from 'vitest';
import { fromStudentsUrl, parseStudentsSearch, setColumnFilter, toStudentsUrl } from './search';

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

  it('carries the filters, so a shared or reloaded URL keeps them (R-STU-01)', () => {
    const url = { search: 'سهيلة', page: '2', status: 'active,trial', teacher: 'none', package: 'low', weekly: 'no', junk: 'x' };
    expect(parseStudentsSearch(url)).toEqual({ search: 'سهيلة', page: 2, status: 'trial,active', teacher: 'none', package: 'low', weekly: 'no' });
  });
});

describe('students URL sort + column filters (R-NFR-08)', () => {
  it('parses an allowlisted sort and the f_ column filters; drops junk', () => {
    const url = { sort: 'guardian', dir: 'desc', f_code: ' 018 ', f_name: '', f_junk: 'x' };
    expect(parseStudentsSearch(url)).toMatchObject({ sort: 'guardian', dir: 'desc', f_code: '018' });
    expect(parseStudentsSearch({ sort: 'guardian_id' }).sort).toBeUndefined();
  });

  it('round-trips the page state through the URL, defaults left out', () => {
    const state = { search: 'x', page: 1, filters: { teacher: 'none' }, sort: { sort: 'name', dir: 'desc' as const }, columns: { guardian: 'ام' } };
    const url = toStudentsUrl(state);
    expect(url).toMatchObject({ search: 'x', teacher: 'none', sort: 'name', dir: 'desc', f_guardian: 'ام' });
    expect(url.page).toBeUndefined();
    expect(fromStudentsUrl(url)).toEqual(state);
  });

  it('setColumnFilter trims, and drops a blank value', () => {
    expect(setColumnFilter({ code: '1' }, { key: 'name', value: ' سه ' })).toEqual({ code: '1', name: 'سه' });
    expect(setColumnFilter({ code: '1' }, { key: 'code', value: ' ' })).toEqual({});
  });
});
