import { routePath } from '@ab/core';
import { describe, expect, it } from 'vitest';
import { coursePauseRoutes as routes } from '../course-pause.routes';

const STUDENT = 'e1111111-1111-4111-8111-111111111111';
const SUB = 'e2222222-2222-4222-8222-222222222222';
const LOOSE_HEX = '3f1c2a7e-9b4d-0e1a-0c2f-1d2e3f4a5b6c';
const VIEW = {
  id: 'e3333333-3333-4333-8333-333333333333',
  from_date: '2026-12-01',
  until_date: null,
  reason: null,
  created_at: '2026-11-27T10:00:00.000+00:00',
  created_by_name: null,
  resumed_at: null,
  extended_days: null,
};
const RESULT = { pause: VIEW, cancelled: 2, left: 0, reopened: 0, conflicts: 0 };

describe('coursePauseRoutes', () => {
  it('keeps the paths the api serves today', () => {
    const lines = Object.values(routes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'GET /students/:id/course-pause',
      'GET /students/:id/course-pause/preview',
      'GET /students/:id/course-pause/resume-preview',
      'POST /students/:id/course-pause',
      'PATCH /students/:id/course-pause/until',
      'POST /students/:id/course-pause/resume',
    ]);
    expect(routePath(routes.until, { id: STUDENT })).toBe(
      `/students/${STUDENT}/course-pause/until`,
    );
  });

  it('keeps the strict uuid check on the student id', () => {
    expect(routes.state.params.safeParse({ id: STUDENT }).success).toBe(true);
    expect(routes.state.params.safeParse({ id: LOOSE_HEX }).success).toBe(false);
  });

  it('answers the open pause and the past ones', () => {
    const state = { open: VIEW, history: [{ ...VIEW, resumed_at: VIEW.created_at }] };
    expect(routes.state.response.parse(state)).toEqual(state);
    expect(routes.state.response.parse({ open: null, history: [] }).open).toBeNull();
    expect(routes.state.response.safeParse({ open: null }).success).toBe(false);
  });

  it('previews a window, open-ended or not, with or without the old optional lines', () => {
    expect(routes.preview.query.parse({ from: '2026-12-01' })).toEqual({ from: '2026-12-01' });
    expect(routes.preview.query.safeParse({ from: '1 Dec' }).success).toBe(false);
    const old = { from_date: '2026-12-01', until_date: null, lessons: 3 };
    expect(routes.preview.response.parse(old)).toEqual(old);
    const full = { ...old, starts: ['2026-12-02T14:00:00.000Z'], extend_days: null };
    expect(routes.preview.response.parse(full)).toEqual(full);
  });

  it('answers the lessons a resume books back and the days the package moves', () => {
    const back = { back: ['2026-12-02T14:00:00.000Z'], extendDays: 4 };
    expect(routes.resumePreview.response.parse(back)).toEqual(back);
    expect(routes.resumePreview.response.safeParse({ back: [] }).success).toBe(false);
  });

  it('takes the start, until and resume bodies, an empty one included', () => {
    expect(routes.start.body.parse({})).toEqual({});
    expect(routes.start.body.safeParse({ untilDate: '2026-12-10', extra: 1 }).success).toBe(false);
    expect(routes.until.body.parse({ untilDate: null })).toEqual({ untilDate: null });
    expect(routes.until.body.safeParse({}).success).toBe(false);
    expect(routes.resume.body.parse({ subscriptionId: SUB })).toEqual({ subscriptionId: SUB });
  });

  it('reads a write sent without a body as an empty one', () => {
    expect(routes.start.body.parse(undefined)).toEqual({});
    expect(routes.resume.body.parse(undefined)).toEqual({});
    expect(routes.until.body.safeParse(undefined).success).toBe(false);
  });

  it('answers what every write did, and refuses one without its counts', () => {
    [routes.start, routes.until, routes.resume].forEach((route) => {
      expect(route.response.parse(RESULT)).toEqual(RESULT);
    });
    const { conflicts: _c, ...noConflicts } = RESULT;
    expect(routes.resume.response.safeParse(noConflicts).success).toBe(false);
  });
});
