import { describe, expect, it } from 'vitest';
import { leadRow } from '../../../testing/sales/leads';
import { leadWriteRoutes as routes } from '../leads.routes';

const ROW = leadRow({ qualification: { age: 9 }, last_inbound_at: '2026-11-01T10:00:00+00:00' });
const LEAD = ROW.id;

describe('leadWriteRoutes', () => {
  it('keeps the paths, the permission and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['PATCH', '/leads/:id/status', ['leads.write'], ['leads']],
      ['POST', '/leads/:id/reclassify', ['leads.write'], ['leads']],
      ['PATCH', '/leads/:id/qualification', ['leads.write'], ['leads']],
      ['PATCH', '/leads/:id/follow-up', ['leads.write'], ['leads']],
    ]);
  });

  it('takes a uuid lead id only', () => {
    expect(routes.changeStatus.params.parse({ id: LEAD })).toEqual({ id: LEAD });
    expect(routes.reclassify.params.safeParse({ id: 'abc' }).success).toBe(false);
  });

  it('takes a known status, a boolean pause and a qualification patch that may clear a field', () => {
    expect(routes.changeStatus.body.safeParse({ status: 'no_reply' }).success).toBe(true);
    expect(routes.changeStatus.body.safeParse({ status: 'x' }).success).toBe(false);
    expect(routes.followUp.body.safeParse({ paused: 'yes' }).success).toBe(false);
    expect(routes.qualification.body.safeParse({ goal: null }).success).toBe(true);
    expect(routes.qualification.body.safeParse({ age: 'tween' }).success).toBe(false);
  });

  it('answers the lead row and refuses an unknown status, pauser or note', () => {
    expect(routes.changeStatus.response.parse(ROW)).toEqual(ROW);
    const bad = [
      { ...ROW, status: 'lost-ish' },
      { ...ROW, follow_up_paused_by: 'bot' },
      { ...ROW, follow_up_note: 'late' },
      { ...ROW, qualification: null },
    ];
    for (const row of bad) expect(routes.followUp.response.safeParse(row).success).toBe(false);
  });
});
