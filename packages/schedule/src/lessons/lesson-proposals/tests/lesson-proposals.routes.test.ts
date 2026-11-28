import { describe, expect, it } from 'vitest';
import { lessonProposalRoutes as routes, lessonProposeRoutes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const AT = '2026-10-06T15:30:00.000Z';

describe('lessonProposalRoutes (R-SCH-08)', () => {
  it.each([
    ['pending', 'GET /lesson-proposals'],
    ['approve', 'POST /lesson-proposals/:id/approve'],
    ['reject', 'POST /lesson-proposals/:id/reject'],
  ] as const)('%s keeps %s, let in by lessons.write, tagged lessons', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([['lessons.write'], ['lessons']]);
  });

  it('names the proposal by uuid', () => {
    expect(routes.approve.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.reject.params.safeParse({ id: 'p1' }).success).toBe(false);
  });

  it('reads a request without a JSON body as no answer at all', () => {
    expect(routes.approve.body.parse(undefined)).toEqual({});
    expect(routes.reject.body.parse(null)).toEqual({});
  });

  it('takes an override reason or another time on approve', () => {
    const body = { override: { reason: 'ولي الأمر موافق' }, startsAt: AT };
    expect(routes.approve.body.parse(body)).toEqual(body);
    expect(routes.approve.body.safeParse({ startsAt: 'tomorrow' }).success).toBe(false);
  });

  it('trims the note the family reads and caps it at 500 characters', () => {
    expect(routes.reject.body.parse({ note: ' لا يتوفر وقت ' })).toEqual({ note: 'لا يتوفر وقت' });
    expect(routes.reject.body.safeParse({ note: 'x'.repeat(501) }).success).toBe(false);
  });

  it('answers a list of lessons on pending', () => {
    expect(routes.pending.response.parse([])).toEqual([]);
    expect(routes.pending.response.safeParse({}).success).toBe(false);
  });
});

describe('lessonProposeRoutes (R-SCH-08)', () => {
  it('keeps POST /lessons/:id/propose for the teacher herself, tagged lessons', () => {
    const route = lessonProposeRoutes.propose;
    expect(`${route.method} ${route.path}`).toBe('POST /lessons/:id/propose');
    expect([route.permissions, route.tags]).toEqual([['self.teacher'], ['lessons']]);
  });

  it('needs the new start and keeps a trimmed note', () => {
    const { body } = lessonProposeRoutes.propose;
    expect(body.parse({ startsAt: AT, note: ' ظرف ' })).toEqual({ startsAt: AT, note: 'ظرف' });
    expect(body.safeParse({ note: 'ظرف' }).success).toBe(false);
  });
});
