import { describe, expect, it } from 'vitest';
import { lessonRoomRoutes as routes } from '..';

const JOIN = { url: 'wss://x', token: 't', room: 'r', role: 'guest' };

describe('lessonRoomRoutes.studentJoin (R-LES-01)', () => {
  it('keeps the path the api serves, tagged classroom, with no permission (no login)', () => {
    const route = routes.studentJoin;
    expect(`${route.method} ${route.path}`).toBe('POST /public/student/:token/join');
    expect(route).not.toHaveProperty('permissions');
    expect(route.tags).toEqual(['classroom']);
  });

  it('takes any link text, so a foreign token is answered by the api as its own 404', () => {
    const long = { token: 'x'.repeat(300) };
    expect(routes.studentJoin.params.parse(long)).toEqual(long);
    expect(routes.studentJoin.params.safeParse({}).success).toBe(false);
  });

  it("takes an optional trimmed name of at most 30 (the student's first name otherwise)", () => {
    expect(routes.studentJoin.body.parse({ name: ' سارة ' })).toEqual({ name: 'سارة' });
    expect(routes.studentJoin.body.parse({})).toEqual({});
    expect(routes.studentJoin.body.safeParse({ name: '' }).success).toBe(false);
    expect(routes.studentJoin.body.safeParse({ name: 'x'.repeat(31) }).success).toBe(false);
  });

  it('answers the room credentials with a known role only', () => {
    expect(routes.studentJoin.response.parse(JOIN)).toEqual(JOIN);
    expect(routes.studentJoin.response.safeParse({ ...JOIN, role: 'x' }).success).toBe(false);
  });
});
