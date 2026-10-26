import { describe, expect, it } from 'vitest';
import { inSalesScope } from './sales-lessons';
import { meetingRow, NONE, OWN_A } from '../sales.fakes';

describe('inSalesScope: the one rule for the meetings list and the classroom', () => {
  it('booked from one of my leads', () => {
    expect(inSalesScope(meetingRow(), OWN_A)).toBe(true);
  });

  it('a trial lesson of one of my students, even without a lead on the rule', () => {
    const row = meetingRow({ rule: { created_from_lead_id: null, package: 'trial', lead: null } });
    expect(inSalesScope(row, OWN_A)).toBe(true);
  });

  it('a paid lesson of my student (not a trial, not from a lead) is not a meeting', () => {
    const row = meetingRow({ rule: { created_from_lead_id: null, package: '8', lead: null } });
    expect(inSalesScope(row, OWN_A)).toBe(false);
  });

  it("another salesperson's lead and a lesson with no rule are out", () => {
    expect(inSalesScope(meetingRow({ rule: { created_from_lead_id: 'l9', package: 'trial', lead: null }, lesson_students: [] }), OWN_A)).toBe(false);
    expect(inSalesScope(meetingRow({ rule: null }), OWN_A)).toBe(false);
    expect(inSalesScope(meetingRow(), NONE)).toBe(false);
  });
});
