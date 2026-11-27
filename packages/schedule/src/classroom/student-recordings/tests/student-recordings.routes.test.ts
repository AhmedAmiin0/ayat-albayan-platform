import { describe, expect, it } from 'vitest';
import { studentRecordingsRoutes as routes } from '..';

const ID = '0b9f4a3e-7c1d-4e2a-9b6f-1d2c3e4f5a6b';
const row = {
  id: 'R',
  lesson_id: 'L',
  lesson_starts_at: '2026-11-16T17:00:00.000Z',
  started_at: '2026-11-16T17:01:00.000Z',
  teacher: { id: 'T', display_name_ar: 'أبرار', display_name_en: null },
  status: 'done',
  duration_seconds: 1800,
  size_bytes: 1024,
  media: 'audio',
  visible_to_student: false,
  can_manage: true,
  url: 'https://files.example/r',
};
const page = { items: [row], total: 1, page: 1, pageSize: 10 };

describe('studentRecordingsRoutes (R-REC)', () => {
  it.each([
    ['list', 'GET /students/:id/recordings'],
    ['recordedLessonIds', 'GET /students/:id/recorded-lesson-ids'],
    ['visibility', 'PATCH /recordings/:id/visibility'],
    ['remove', 'DELETE /recordings/:id'],
  ] as const)('%s keeps the path the api serves today', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
  });

  it('still answers 400 for an id that is not one, now through the shared id', () => {
    expect(routes.list.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.remove.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('pages ten by default and keeps the filters', () => {
    const query = routes.list.query.parse({ status: 'done', from: '2026-11-01' });
    expect(query).toEqual({ page: 1, pageSize: 10, status: 'done', from: '2026-11-01' });
    expect(routes.list.query.safeParse({ status: 'lost' }).success).toBe(false);
  });

  it('answers the page and refuses a row in an unknown state or medium', () => {
    expect(routes.list.response.parse(page)).toEqual(page);
    const states = [{ ...row, status: 'paused' }, { ...row, media: 'image' }];
    for (const bad of states) {
      expect(routes.list.response.safeParse({ ...page, items: [bad] }).success).toBe(false);
    }
  });

  it('answers the recorded lesson ids and the visibility toggle', () => {
    expect(routes.recordedLessonIds.response.parse(['L1', 'L2'])).toEqual(['L1', 'L2']);
    const toggled = { id: 'R', visible_to_student: true };
    expect(routes.visibility.response.parse(toggled)).toEqual(toggled);
    expect(routes.visibility.body.safeParse({ visible: 1 }).success).toBe(false);
  });

  it('answers nothing on delete', () => {
    expect(routes.remove.response).toBe('empty');
  });
});
