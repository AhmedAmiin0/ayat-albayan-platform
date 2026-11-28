import { describe, expect, it } from 'vitest';
import { lessonMoveRoutes as routes, ruleCancelRoutes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const AT = '2026-10-06T15:30:00.000Z';

describe('lessonMoveRoutes (R-SCH-07, R-SCH-11)', () => {
  it.each([
    ['reschedule', 'POST /lessons/:id/reschedule'],
    ['editTime', 'PATCH /lessons/:id/time'],
  ] as const)('%s keeps %s, let in by lessons.write, tagged lessons', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([['lessons.write'], ['lessons']]);
  });

  it('names the lesson by uuid', () => {
    expect(routes.reschedule.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.editTime.params.safeParse({ id: 'l1' }).success).toBe(false);
  });

  it('moves one lesson to a new start, and refuses a move without one', () => {
    const body = { scope: 'one', startsAt: AT };
    expect(routes.reschedule.body.parse(body)).toMatchObject(body);
    expect(routes.reschedule.body.safeParse({ scope: 'one' }).success).toBe(false);
  });

  it('edits the time against the start the admin saw', () => {
    const body = { expectedStartsAt: AT, startsAt: AT, durationMin: 45 };
    expect(routes.editTime.body.parse(body)).toMatchObject(body);
    expect(routes.editTime.body.safeParse({ startsAt: AT, durationMin: 45 }).success).toBe(false);
  });

  it('answers the edit with what it set in motion, and refuses another payout state', () => {
    const { response } = routes.editTime;
    const answer = { lesson: {}, notified: 1, payout: 'paid', pdf_refresh: false };
    expect(response.safeParse(answer).success).toBe(false);
    expect(response.shape.payout.options).toEqual(['none', 'draft_stale']);
  });
});

describe('ruleCancelRoutes (R-SCH-07)', () => {
  it('keeps POST /schedule-rules/:id/cancel, let in by lessons.write, tagged schedule-rules', () => {
    const route = ruleCancelRoutes.cancel;
    expect(`${route.method} ${route.path}`).toBe('POST /schedule-rules/:id/cancel');
    expect([route.permissions, route.tags]).toEqual([['lessons.write'], ['schedule-rules']]);
  });

  it('needs who cancelled and why; the first day is optional', () => {
    const { body } = ruleCancelRoutes.cancel;
    const asked = { by: 'student', reason: 'سفر', from: '2026-10-10' };
    expect(body.parse(asked)).toEqual(asked);
    expect(body.safeParse({ by: 'student' }).success).toBe(false);
  });

  it('answers the rule id and the cancelled lessons', () => {
    const { response } = ruleCancelRoutes.cancel;
    expect(response.parse({ rule_id: ID, cancelled: [] })).toEqual({ rule_id: ID, cancelled: [] });
    expect(response.safeParse({ rule_id: 'r1', cancelled: [] }).success).toBe(false);
  });
});
