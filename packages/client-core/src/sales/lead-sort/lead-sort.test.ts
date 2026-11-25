import { describe, expect, it } from 'vitest';
import { leadSortFromValue, leadSortValue, parseLeadSort } from './lead-sort';

describe('lead list order (R-NFR-08)', () => {
  it('select value ↔ sort, unknown keys → the default order', () => {
    expect(leadSortFromValue('created_at:desc')).toEqual({ sort: 'created_at', dir: 'desc' });
    expect(leadSortFromValue('created_at')).toEqual({ sort: 'created_at' });
    expect(leadSortFromValue('name')).toEqual({ sort: 'name' });
    expect(leadSortFromValue('')).toEqual({});
    expect(leadSortFromValue('password:desc')).toEqual({});
    expect(leadSortValue({ sort: 'created_at', dir: 'desc' })).toBe('created_at:desc');
    expect(leadSortValue({})).toBe('');
  });

  it('parseLeadSort ignores dir without desc', () => {
    expect(parseLeadSort('status', 'asc')).toEqual({ sort: 'status' });
  });
});
