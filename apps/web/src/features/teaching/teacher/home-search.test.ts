import { describe, expect, it } from 'vitest';
import { parseTeacherHomeSearch } from './home-search';

describe('parseTeacherHomeSearch (docs/48 ?tab=)', () => {
  it('none or junk reads as no tab (the home opens «طلابي»)', () => {
    expect(parseTeacherHomeSearch({})).toEqual({ tab: undefined });
    expect(parseTeacherHomeSearch({ tab: 'nope' })).toEqual({ tab: undefined });
    expect(parseTeacherHomeSearch({ tab: 3 })).toEqual({ tab: undefined });
  });

  it.each(['students', 'today', 'week', 'availability'])('keeps %s', (tab) => {
    expect(parseTeacherHomeSearch({ tab })).toEqual({ tab });
  });
});
