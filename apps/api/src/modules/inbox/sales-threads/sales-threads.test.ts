import { describe, expect, it } from 'vitest';
import { threadStudent } from '../inbox.fakes';
import { salesPeople, visibleToSales } from './sales-threads';

describe('sales thread helpers', () => {
  it('visibleToSales keeps plain text and every template except the two signed-link ones', () => {
    expect(visibleToSales({ template_key: null })).toBe(true);
    expect(visibleToSales({ template_key: 'lesson_reminder' })).toBe(true);
    expect(visibleToSales({ template_key: 'lesson_join_link' })).toBe(false);
    expect(visibleToSales({ template_key: 'lesson_feedback_request' })).toBe(false);
  });

  it('salesPeople: every child of the family, packages and money removed, lead kept', () => {
    const people = { guardian: { id: 'g', name: 'x' }, lead: { id: 'l', status: 'converted' as const }, students: [threadStudent(), threadStudent({ id: 'z' })] };
    const out = salesPeople(people);
    expect(out.lead).toEqual(people.lead);
    expect(out.students.map((s) => [s.id, s.subscription])).toEqual([['s1', null], ['z', null]]);
  });
});
