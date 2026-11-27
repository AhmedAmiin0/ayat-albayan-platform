import { describe, expect, it } from 'vitest';
import { lessonRoomRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const WINDOW = {
  state: 'early',
  opens_at: '2026-11-27T09:45:00.000Z',
  closes_at: '2026-11-27T12:00:00.000Z',
};
const LESSON = {
  id: ID,
  starts_at: '2026-11-27T10:00:00.000Z',
  ends_at: '2026-11-27T10:30:00.000Z',
  teacher_name: 'مريم',
  window: WINDOW,
};

describe('lessonRoomRoutes (R-LES-01)', () => {
  it.each([
    ['open', 'POST /lessons/:id/room/open', ['classroom.host']],
    ['issueStudentLink', 'POST /students/:id/join-link', ['classroom.links']],
  ] as const)('%s keeps its path and permission, tagged classroom', (key, wire, permissions) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([permissions, ['classroom']]);
  });

  it('serves the student link with no login, tagged classroom', () => {
    const route = routes.studentLink;
    expect(`${route.method} ${route.path}`).toBe('GET /public/student/:token');
    expect(route).not.toHaveProperty('permissions');
    expect(route.tags).toEqual(['classroom']);
  });

  it('refuses a lesson or student id that is not a uuid', () => {
    expect(routes.open.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.issueStudentLink.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.open.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('takes any link text, so a foreign token is answered by the api as its own 404', () => {
    const long = { token: 'x'.repeat(300) };
    expect(routes.studentLink.params.parse(long)).toEqual(long);
    expect(routes.studentLink.params.safeParse({}).success).toBe(false);
  });

  it('answers the opened window with its stamp, and refuses an unknown state', () => {
    const opened = { ...WINDOW, state: 'open', room_opened_at: WINDOW.opens_at };
    expect(routes.open.response.parse(opened)).toEqual(opened);
    expect(routes.open.response.safeParse({ ...opened, state: 'late' }).success).toBe(false);
    expect(routes.open.response.safeParse(WINDOW).success).toBe(false);
  });

  it('answers the student page with or without a lesson ahead', () => {
    const view = routes.studentLink.response;
    expect(view.parse({ first_name: 'ليلى', lesson: LESSON })).toEqual({
      first_name: 'ليلى',
      lesson: LESSON,
    });
    expect(view.parse({ first_name: 'ليلى', lesson: null }).lesson).toBeNull();
    expect(view.safeParse({ first_name: 'ليلى', lesson: { ...LESSON, id: 'x' } }).success).toBe(
      false,
    );
  });

  it('answers the issued link as its url', () => {
    const url = { url: 'https://example.test/s/abc' };
    expect(routes.issueStudentLink.response.parse(url)).toEqual(url);
    expect(routes.issueStudentLink.response.safeParse({}).success).toBe(false);
  });
});
