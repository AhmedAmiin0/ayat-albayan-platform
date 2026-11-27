import { describe, expect, it } from 'vitest';
import { lessonJoinRoutes as routes } from '..';

const ID = '00000000-0000-4000-8000-000000000001';
const STUDENT = '00000000-0000-4000-8000-000000000002';
const EXPIRES = '2026-11-27T12:00:00.000Z';

describe('lessonJoinRoutes (R-LES-01)', () => {
  it.each([
    ['join', 'POST /lessons/:id/room/join', ['classroom.join']],
    ['sendLink', 'POST /lessons/:id/join-link', ['classroom.links']],
    ['linkUrl', 'POST /lessons/:id/join-link/url', ['classroom.host']],
    ['staffLessonOf', 'GET /join-links/:token/lesson', ['classroom.join']],
  ] as const)('%s keeps its path and permission, tagged classroom', (key, wire, permissions) => {
    const route = routes[key];
    expect(`${route.method} ${route.path}`).toBe(wire);
    expect([route.permissions, route.tags]).toEqual([permissions, ['classroom']]);
  });

  it('refuses a lesson id that is not a uuid', () => {
    expect(routes.join.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.sendLink.params.safeParse({ id: 'nope' }).success).toBe(false);
    expect(routes.linkUrl.params.parse({ id: ID })).toEqual({ id: ID });
  });

  it('takes any link text, so a foreign token is answered by the api as its own 404', () => {
    const long = { token: 'x'.repeat(300) };
    expect(routes.staffLessonOf.params.parse(long)).toEqual(long);
    expect(routes.staffLessonOf.params.safeParse({}).success).toBe(false);
  });

  it('sends the link to one student of the lesson, named by uuid', () => {
    expect(routes.sendLink.body.parse({ studentId: STUDENT })).toEqual({ studentId: STUDENT });
    expect(routes.sendLink.body.safeParse({ studentId: 'x' }).success).toBe(false);
    expect(routes.sendLink.body.safeParse({}).success).toBe(false);
  });

  it('answers the sent link with a known message status only', () => {
    const sent = { expires_at: EXPIRES, replayed: false, message_status: 'sent' };
    expect(routes.sendLink.response.parse(sent)).toEqual(sent);
    expect(routes.sendLink.response.safeParse({ ...sent, message_status: 'x' }).success).toBe(
      false,
    );
  });

  it('answers the copied link with its url and expiry', () => {
    const link = { url: 'https://example.test/join/abc', expires_at: EXPIRES };
    expect(routes.linkUrl.response.parse(link)).toEqual(link);
    expect(routes.linkUrl.response.safeParse({ url: link.url }).success).toBe(false);
  });

  it('answers the staff lookup with the lesson id, a uuid', () => {
    expect(routes.staffLessonOf.response.parse({ lessonId: ID })).toEqual({ lessonId: ID });
    expect(routes.staffLessonOf.response.safeParse({ lessonId: 'x' }).success).toBe(false);
  });

  it('answers the join with the room credentials and a known role', () => {
    const join = { url: 'wss://x', token: 't', room: 'r', role: 'teacher' };
    expect(routes.join.response.parse(join)).toEqual(join);
    expect(routes.join.response.safeParse({ ...join, role: 'boss' }).success).toBe(false);
  });
});
