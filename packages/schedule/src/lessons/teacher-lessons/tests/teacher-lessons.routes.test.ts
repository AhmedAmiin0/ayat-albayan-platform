import { describe, expect, it } from 'vitest';
import { teacherLessonRoutes as routes } from '..';

const LESSON = '00000000-0000-4000-8000-000000000001';

describe('teacherLessonRoutes (docs/46 C3, C4)', () => {
  it.each([
    ['cancel', 'POST /teachers/me/lessons/:id/cancel'],
    ['confirm', 'POST /teachers/me/lessons/:id/confirm-attendance'],
  ] as const)('%s keeps its path, let in by self.teacher, tagged teachers', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([['self.teacher'], ['teachers']]);
  });

  it('names the lesson by uuid', () => {
    expect(routes.cancel.params.parse({ id: LESSON })).toEqual({ id: LESSON });
    expect(routes.confirm.params.safeParse({ id: 'l1' }).success).toBe(false);
  });

  it('takes a cancel with a reason only, and refuses a blank one', () => {
    expect(routes.cancel.body.parse({ reason: 'سفر' })).toEqual({ reason: 'سفر' });
    expect(routes.cancel.body.safeParse({ reason: ' ' }).success).toBe(false);
    expect(routes.cancel.body.safeParse({}).success).toBe(false);
  });

  it('confirms without a body', () => {
    expect('body' in routes.confirm).toBe(false);
  });

  it('answers one lesson view, and refuses a list or a bare id', () => {
    expect(routes.cancel.response.safeParse([]).success).toBe(false);
    expect(routes.confirm.response.safeParse({ id: LESSON }).success).toBe(false);
  });
});
