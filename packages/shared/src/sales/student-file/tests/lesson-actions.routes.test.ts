import { describe, expect, it } from 'vitest';
import { salesLessonActionRoutes as routes } from '../lesson-actions.routes';

const ID = '11111111-1111-4111-8111-111111111111';
const AT = '2026-11-01T15:00:00.000Z';

describe('salesLessonActionRoutes', () => {
  it('keeps the paths, the permissions and the tag the api serves today', () => {
    const wire = Object.values(routes).map((r) => [r.method, r.path, r.permissions, r.tags]);
    expect(wire).toEqual([
      ['POST', '/sales/lessons/:id/reschedule', ['lessons.reschedule'], ['sales']],
      ['POST', '/sales/lessons/:id/cancel', ['lessons.cancel'], ['sales']],
      ['POST', '/sales/lessons/:id/confirm', ['lessons.confirm'], ['sales']],
      ['POST', '/sales/lessons/:id/correct', ['lessons.cancel'], ['sales']],
    ]);
  });

  it('takes the lesson uuid only', () => {
    expect(routes.reschedule.params.safeParse({ id: 'l-1' }).success).toBe(false);
    expect(routes.confirm.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('reads an absent cancel body as no reason, and refuses an unknown key', () => {
    expect(routes.cancel.body.parse(undefined)).toEqual({});
    expect(routes.cancel.body.parse(null)).toEqual({});
    expect(routes.cancel.body.parse({ by: 'teacher' })).toEqual({ by: 'teacher' });
    expect(routes.cancel.body.safeParse({ scope: 'rule' }).success).toBe(false);
  });

  it('needs a time to move and an outcome to correct', () => {
    expect(routes.reschedule.body.safeParse(undefined).success).toBe(false);
    expect(routes.reschedule.body.parse({ startsAt: AT })).toEqual({ startsAt: AT });
    expect(routes.correct.body.parse({ to: 'no_show' })).toEqual({ to: 'no_show' });
    expect(routes.correct.body.safeParse({ to: 'completed', x: 1 }).success).toBe(false);
  });

  it('answers the moved lesson or the lesson and its status', () => {
    const moved = { id: ID, starts_at: AT, status: 'confirmed' };
    expect(routes.confirm.response.parse(moved)).toEqual(moved);
    expect(routes.reschedule.response.safeParse({ ...moved, starts_at: 'soon' }).success).toBe(
      false,
    );
    expect(routes.cancel.response.parse({ id: ID, status: 'cancelled_by_admin' })).toBeTruthy();
    expect(routes.correct.response.safeParse({ id: ID, status: 'gone' }).success).toBe(false);
  });
});
