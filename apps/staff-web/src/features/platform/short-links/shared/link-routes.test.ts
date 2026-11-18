import { describe, expect, it } from 'vitest';
import { filterOf, isFiltered, linkListSearch, LIST_PAGE_SIZE } from './link-routes';

const OWNER = '11111111-1111-4111-8111-111111111111';

describe('linkListSearch', () => {
  it('keeps a good URL and drops what is malformed', () => {
    expect(linkListSearch.parse({ status: 'active', owner: OWNER, q: 'لقاء', page: 2 })).toEqual({
      status: 'active',
      owner: OWNER,
      q: 'لقاء',
      page: 2,
    });
    expect(linkListSearch.parse({ status: 'full', owner: 'x', page: 0 })).toEqual({});
  });
});

describe('filterOf', () => {
  it('page 1 of the API size, no empty search', () => {
    expect(filterOf({ q: '  ' })).toEqual({ page: 1, pageSize: LIST_PAGE_SIZE });
  });

  it('passes the filters on', () => {
    expect(filterOf({ status: 'revoked', owner: OWNER, q: ' عرض ', page: 3 })).toEqual({
      status: 'revoked',
      owner: OWNER,
      search: 'عرض',
      page: 3,
      pageSize: LIST_PAGE_SIZE,
    });
  });
});

describe('isFiltered', () => {
  it('any status, owner or search', () => {
    expect(isFiltered({})).toBe(false);
    expect(isFiltered({ page: 2, q: ' ' })).toBe(false);
    expect(isFiltered({ status: 'expired' })).toBe(true);
    expect(isFiltered({ owner: OWNER })).toBe(true);
    expect(isFiltered({ q: 'x' })).toBe(true);
  });
});
