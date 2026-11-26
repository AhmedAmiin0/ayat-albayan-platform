import { leadSortFromValue, leadSortValue } from '@ab/client-core';
import { describe, expect, it } from 'vitest';
import { leadSortChoices } from './lead-sort';
import { parseLeadSearch } from '@/features/sales/leads/types';

const A = '11111111-1111-4111-8111-111111111111';

describe('lead list order + assignee (R-NFR-08, R-LEAD-05)', () => {
  it('every choice round-trips', () => {
    for (const { value } of leadSortChoices())
      expect(leadSortValue(leadSortFromValue(value))).toBe(value);
  });

  it('the URL keeps sort, dir and a valid assignee; junk dropped', () => {
    expect(parseLeadSearch({ page: '2', sort: 'source', dir: 'desc', assignee: A })).toEqual({ page: 2, sort: 'source', dir: 'desc', assignee: A });
    expect(parseLeadSearch({ assignee: 'none' }).assignee).toBe('none');
    expect(parseLeadSearch({ assignee: 'bob', sort: 'x' })).toEqual({ page: 1 });
  });
});
