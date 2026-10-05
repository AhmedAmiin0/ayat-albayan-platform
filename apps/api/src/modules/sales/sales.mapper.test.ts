import { describe, expect, it } from 'vitest';
import { dirtySubscription, meetingRow } from './sales.fakes';
import { toSalesMeeting, toSalesSubscription } from './sales.mapper';

describe('toSalesSubscription', () => {
  it('is a whitelist: price, currency, fx, notes and payments never come through', () => {
    const view = toSalesSubscription(dirtySubscription());
    expect(Object.keys(view).sort()).toEqual(['id', 'lessons_total', 'package', 'starts_on', 'status', 'student']);
  });
});

describe('toSalesMeeting', () => {
  const now = new Date('2026-10-05T16:05:00Z');
  const at = (iso: string) => ({ now: new Date(iso) });
  it('the lead name wins, then the children; the window is the classroom one (15 min before, 2 h after)', () => {
    expect(toSalesMeeting(meetingRow(), { now })).toMatchObject({ lead_or_student_name: 'أم ياسمين', joinable_window: { state: 'open' } });
    const noLead = meetingRow({ rule: { created_from_lead_id: null, package: 'trial', lead: null } });
    expect(toSalesMeeting(noLead, { now }).lead_or_student_name).toBe('ياسمين');
    expect(toSalesMeeting(meetingRow(), at('2026-10-05T10:00:00Z')).joinable_window.state).toBe('early');
    expect(toSalesMeeting(meetingRow(), at('2026-10-05T19:00:00Z')).joinable_window.state).toBe('closed');
  });

  it('a changed classroom window (settings) changes the state', () => {
    const late = new Date('2026-10-05T17:30:00Z');
    expect(toSalesMeeting(meetingRow(), { now: late }).joinable_window.state).toBe('open');
    const win = { opensBeforeMin: 15, closesAfterMin: 10 };
    expect(toSalesMeeting(meetingRow(), { now: late, win }).joinable_window.state).toBe('closed');
  });
});
