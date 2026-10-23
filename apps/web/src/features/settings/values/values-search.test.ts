import { describe, expect, it } from 'vitest';
import { parseValuesSearch, showsAll } from './values-search';

describe('parseValuesSearch', () => {
  it('keeps the group and the search text', () => {
    expect(parseValuesSearch({ group: 'accounts', q: 'عملة' })).toEqual({ group: 'accounts', q: 'عملة' });
  });
  it('drops empty and non-string params', () => {
    expect(parseValuesSearch({ group: '', q: 3 })).toEqual({});
  });
  it('keeps a known filter only', () => {
    expect(parseValuesSearch({ filter: 'modified' })).toEqual({ filter: 'modified' });
    expect(parseValuesSearch({ filter: 'public' })).toEqual({ filter: 'public' });
    expect(parseValuesSearch({ filter: 'other' })).toEqual({});
  });
});

describe('showsAll', () => {
  it('is true for a search or a filter, never for a group alone', () => {
    expect(showsAll({ group: 'accounts' })).toBe(false);
    expect(showsAll({ q: '  ' })).toBe(false);
    expect(showsAll({ q: 'ساعة' })).toBe(true);
    expect(showsAll({ filter: 'public' })).toBe(true);
  });
});
