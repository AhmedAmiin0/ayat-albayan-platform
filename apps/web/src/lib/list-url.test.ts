import { describe, expect, it } from 'vitest';
import { listUrlValidator, parseListUrl, toListUrl, withFilter, withSort } from './list-url';

const KEYS = { sortKeys: ['name', 'status'], filterKeys: ['name', 'status'] };

describe('list URL state (R-NFR-08)', () => {
  it('parses page, allowlisted sort and f_ filters; junk dropped', () => {
    const url = { page: '3', sort: 'name', dir: 'desc', f_status: 'active', f_x: '1', f_name: ' ' };
    expect(parseListUrl(url, KEYS)).toEqual({ page: 3, sort: { sort: 'name', dir: 'desc' }, filters: { status: 'active' } });
    expect(parseListUrl({ page: '0', sort: 'password' }, KEYS)).toEqual({ page: 1, sort: {}, filters: {} });
  });

  it('writes back only what is not a default', () => {
    expect(toListUrl({ page: 1, sort: {}, filters: {} })).toEqual({});
    expect(toListUrl({ page: 2, sort: { sort: 'status' }, filters: { name: ' سا ' } })).toEqual({ page: 2, sort: 'status', f_name: 'سا' });
  });

  it('validator = parse then write', () => {
    expect(listUrlValidator(KEYS)({ page: '2', dir: 'desc', sort: 'name', other: 'x' })).toEqual({ page: 2, sort: 'name', dir: 'desc' });
  });

  it('a sort or filter change goes back to page 1', () => {
    const state = { page: 4, sort: { sort: 'name' }, filters: { status: 'active' } };
    expect(withSort(state, { key: 'status', dir: 'desc' })).toEqual({ ...state, page: 1, sort: { sort: 'status', dir: 'desc' } });
    expect(withSort(state, {})).toEqual({ ...state, page: 1, sort: {} });
    expect(withFilter(state, { key: 'status', value: '' })).toEqual({ ...state, page: 1, filters: {} });
    expect(withFilter(state, { key: 'name', value: ' x ' }).filters).toEqual({ status: 'active', name: 'x' });
  });
});
