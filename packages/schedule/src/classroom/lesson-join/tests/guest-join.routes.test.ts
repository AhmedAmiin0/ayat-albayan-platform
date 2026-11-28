import { describe, expect, it } from 'vitest';
import { lessonJoinRoutes as routes } from '..';

const JOIN = { url: 'wss://x', token: 't', room: 'r', role: 'guest' };

describe('lessonJoinRoutes.guestJoin (R-LES-01)', () => {
  it('keeps the path the api serves, tagged classroom, with no permission (no login)', () => {
    const route = routes.guestJoin;
    expect(`${route.method} ${route.path}`).toBe('POST /public/join/:linkToken');
    expect(route).not.toHaveProperty('permissions');
    expect(route.tags).toEqual(['classroom']);
  });

  it('takes any link text, so a foreign token is answered by the api as its own 404', () => {
    const long = { linkToken: 'x.y'.repeat(100) };
    expect(routes.guestJoin.params.parse(long)).toEqual(long);
    expect(routes.guestJoin.params.safeParse({}).success).toBe(false);
  });

  it('takes a trimmed name of at most 30, or none for the family link', () => {
    expect(routes.guestJoin.body.parse({ name: '  ليلى ' })).toEqual({ name: 'ليلى' });
    expect(routes.guestJoin.body.parse({})).toEqual({});
    expect(routes.guestJoin.body.safeParse({ name: '   ' }).success).toBe(false);
    expect(routes.guestJoin.body.safeParse({ name: 'x'.repeat(31) }).success).toBe(false);
  });

  it('answers the room credentials with a known role only', () => {
    expect(routes.guestJoin.response.parse(JOIN)).toEqual(JOIN);
    expect(routes.guestJoin.response.safeParse({ ...JOIN, role: 'boss' }).success).toBe(false);
    expect(routes.guestJoin.response.safeParse({ url: 'wss://x' }).success).toBe(false);
  });
});
