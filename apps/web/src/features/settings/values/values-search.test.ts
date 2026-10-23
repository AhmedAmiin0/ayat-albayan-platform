import { describe, expect, it } from 'vitest';
import { parseValuesSearch } from './values-search';

describe('parseValuesSearch', () => {
  it('keeps the group and the search text', () => {
    expect(parseValuesSearch({ group: 'accounts', q: 'عملة' })).toEqual({ group: 'accounts', q: 'عملة' });
  });
  it('drops empty and non-string params', () => {
    expect(parseValuesSearch({ group: '', q: 3 })).toEqual({});
  });
});
