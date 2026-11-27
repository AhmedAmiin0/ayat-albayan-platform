import { describe, expect, it } from 'vitest';
import { lessonActionRoutes as routes, studentLessonRoutes } from '..';

const LESSON = '00000000-0000-4000-8000-000000000001';

describe('lessonActionRoutes (R-SCH-03, R-SCH-07, R-SCH-08)', () => {
  it.each([
    ['confirm', 'POST /lessons/:id/confirm', 'lessons.status'],
    ['status', 'POST /lessons/:id/status', 'lessons.status'],
    ['cancel', 'POST /lessons/:id/cancel', 'lessons.write'],
    ['correct', 'POST /lessons/:id/correct', 'lessons.write'],
  ] as const)('%s keeps its path, let in by %s, tagged lessons', (key, wire, permission) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([[permission], ['lessons']]);
  });

  it('names the lesson by uuid', () => {
    expect(routes.confirm.params.parse({ id: LESSON })).toEqual({ id: LESSON });
    expect(routes.cancel.params.safeParse({ id: 'l1' }).success).toBe(false);
  });

  it('takes an outcome with optional per-student overrides', () => {
    const body = { event: 'complete', students: [{ studentId: LESSON, event: 'mark_no_show' }] };
    expect(routes.status.body.parse(body)).toEqual(body);
    expect(routes.status.body.safeParse({ event: 'vanished' }).success).toBe(false);
  });

  it('takes a cancel with its scope, who cancels and a reason', () => {
    const body = { scope: 'one', by: 'teacher', reason: 'سفر' };
    expect(routes.cancel.body.parse(body)).toEqual(body);
    expect(routes.cancel.body.safeParse({ ...body, reason: ' ' }).success).toBe(false);
    expect(routes.cancel.body.safeParse({ ...body, scope: 'all' }).success).toBe(false);
  });

  it('takes a correction target only, nothing more', () => {
    expect(routes.correct.body.parse({ to: 'completed' })).toEqual({ to: 'completed' });
    expect(routes.correct.body.safeParse({ to: 'completed', extra: 1 }).success).toBe(false);
  });

  it('answers a cancel with a list of lesson views and the rest with one', () => {
    expect(routes.cancel.response.parse([])).toEqual([]);
    expect(routes.confirm.response.safeParse([]).success).toBe(false);
    expect(routes.status.response.safeParse({ id: LESSON }).success).toBe(false);
  });
});

describe('studentLessonRoutes (R-LES-03)', () => {
  it('keeps GET /students/:id/lessons, read by students.read, tagged students', () => {
    const route = studentLessonRoutes.list;
    expect(`${route.method} ${route.path}`).toBe('GET /students/:id/lessons');
    expect([route.permissions, route.tags]).toEqual([['students.read'], ['students']]);
  });

  it('pages by 25 by default and answers a page of lesson views', () => {
    const { query, response } = studentLessonRoutes.list;
    expect(query.parse({})).toEqual({ page: 1, pageSize: 25 });
    expect(query.safeParse({ page: 0 }).success).toBe(false);
    const page = { items: [], total: 0, page: 1, pageSize: 25 };
    expect(response.parse(page)).toEqual(page);
    expect(response.safeParse({ ...page, items: [{ id: LESSON }] }).success).toBe(false);
  });
});
