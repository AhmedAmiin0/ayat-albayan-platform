import { describe, expect, it } from 'vitest';
import { leadSortChoices, leadSortFromValue, leadSortValue, parseLeadSort } from './lead-sort';
import { parseLeadSearch } from '@/features/sales/leads/types';

const A = '11111111-1111-4111-8111-111111111111';

describe('lead list order + assignee (R-NFR-08, R-LEAD-05)', () => {
  it('select value ↔ sort, unknown keys → the default order', () => {
    expect(leadSortFromValue('created_at:desc')).toEqual({ sort: 'created_at', dir: 'desc' });
    expect(leadSortFromValue('name')).toEqual({ sort: 'name' });
    expect(leadSortFromValue('')).toEqual({});
    expect(leadSortFromValue('password:desc')).toEqual({});
    expect(leadSortValue({ sort: 'created_at', dir: 'desc' })).toBe('created_at:desc');
    expect(leadSortValue({})).toBe('');
  });

  it('every choice round-trips', () => {
    for (const { value } of leadSortChoices()) expect(leadSortValue(leadSortFromValue(value))).toBe(value);
  });

  it('parseLeadSort ignores dir without desc', () => {
    expect(parseLeadSort('status', 'asc')).toEqual({ sort: 'status' });
  });

  it('the URL keeps sort, dir and a valid assignee; junk dropped', () => {
    expect(parseLeadSearch({ page: '2', sort: 'source', dir: 'desc', assignee: A })).toEqual({ page: 2, sort: 'source', dir: 'desc', assignee: A });
    expect(parseLeadSearch({ assignee: 'none' }).assignee).toBe('none');
    expect(parseLeadSearch({ assignee: 'bob', sort: 'x' })).toEqual({ page: 1 });
  });
});
