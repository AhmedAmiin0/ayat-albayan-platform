import { describe, expect, it } from 'vitest';
import { authMeRoutes } from './auth-me.routes';

const me = {
  id: '9b2f3c4d-1e2a-4b3c-8d4e-5f6a7b8c9d0e',
  email: 'staff@example.test',
  role: 'teacher',
  sessionId: 's1',
  permissions: ['self.portal'],
  tz: 'Africa/Cairo',
  locale: 'ar',
  is_test: false,
};

describe('authMeRoutes (docs/34 §2)', () => {
  it('keeps GET /auth/me under the auth tag, open to any signed-in login', () => {
    const { me: route } = authMeRoutes;
    expect([route.method, route.path, route.tags]).toEqual(['GET', '/auth/me', ['auth']]);
    expect(route.permissions).toBeUndefined();
  });

  it('answers the session as the api sends it today', () => {
    expect(authMeRoutes.me.response.parse(me)).toEqual(me);
  });

  it('reads a login without a profile, zone, language or session', () => {
    const bare = { ...me, email: null, role: null, tz: null, locale: null, permissions: [] };
    const { sessionId: _, ...noSession } = bare;
    expect(authMeRoutes.me.response.parse(noSession)).toEqual(noSession);
  });

  it('refuses an unknown role, permission or language', () => {
    const { response } = authMeRoutes.me;
    expect(response.safeParse({ ...me, role: 'owner' }).success).toBe(false);
    expect(response.safeParse({ ...me, permissions: ['everything'] }).success).toBe(false);
    expect(response.safeParse({ ...me, locale: 'fr' }).success).toBe(false);
  });

  it('drops a field it does not name', () => {
    expect(authMeRoutes.me.response.parse({ ...me, isTest: true })).toEqual(me);
  });
});
