import { describe, expect, it } from 'vitest';
import { familyRequestRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';

const row = {
  id: ID,
  lesson_id: ID,
  starts_at: '2026-11-17T16:30:00.000Z',
  ends_at: '2026-11-17T17:15:00.000Z',
  status: 'scheduled',
  proposed_starts_at: '2026-11-18T15:30:00.000Z',
  note: null,
  created_at: '2026-11-16T10:00:00.000Z',
  teacher: { id: ID, display_name_ar: 'فاطمة', display_name_en: null, tz: 'Africa/Cairo' },
  students: [{ id: ID, code: 'AB-0147', name: 'يوسف', tz: 'Africa/Cairo' }],
};

describe('familyRequestRoutes (R-SCH-08)', () => {
  it.each([
    ['pending', 'GET /family-requests'],
    ['approve', 'POST /family-requests/:id/approve'],
    ['reject', 'POST /family-requests/:id/reject'],
  ] as const)('%s keeps %s, let in by lessons.reschedule, tagged lessons', (key, wire) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([['lessons.reschedule'], ['lessons']]);
  });

  it('names the request by uuid', () => {
    expect(routes.approve.params.parse({ id: ID })).toEqual({ id: ID });
    expect(routes.reject.params.safeParse({ id: 'p1' }).success).toBe(false);
  });

  it('takes a missing body as the empty decision', () => {
    expect(routes.approve.body.parse(undefined)).toEqual({});
    expect(routes.reject.body.parse(null)).toEqual({});
    expect(routes.reject.body.parse({ note: 'لا يتوفر وقت' })).toEqual({ note: 'لا يتوفر وقت' });
  });

  it('answers the waiting rows, and refuses one whose ids are not uuids', () => {
    expect(routes.pending.response.parse([row])).toEqual([row]);
    const foreign = { ...row, lesson_id: 'l1' };
    expect(routes.pending.response.safeParse([foreign]).success).toBe(false);
  });

  it('refuses a row whose lesson status it does not know', () => {
    const odd = { ...row, status: 'moved' };
    expect(routes.pending.response.safeParse([odd]).success).toBe(false);
  });
});
