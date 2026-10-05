import { describe, expect, it } from 'vitest';
import { isExemptRoute, permissionForRoute } from './match.js';
import { ROUTE_PERMISSIONS } from './route-permissions.js';
import { pair } from './route-rules.js';

describe('permissionForRoute', () => {
  it.each([
    ['GET', '/students', 'students.view'],
    ['GET', '/students/123', 'students.view'],
    ['POST', '/students', 'students.manage'],
    ['PATCH', '/students/123', 'students.manage'],
    ['DELETE', '/students/123', 'students.manage'],
    ['HEAD', '/students', 'students.view'],
    ['get', '/payments?page=2', 'payments.view'],
  ])('%s %s -> %s', (method, path, expected) => {
    expect(permissionForRoute(method, path)).toBe(expected);
  });

  it('the most specific prefix wins', () => {
    expect(permissionForRoute('GET', '/students/abc/balance')).toBe('subscriptions.view');
    expect(permissionForRoute('POST', '/students/abc/join-link')).toBe('classrooms.manage');
    expect(permissionForRoute('GET', '/students/abc/lessons')).toBe('schedule.view');
    expect(permissionForRoute('GET', '/lessons/abc/recordings')).toBe('recordings.view');
    expect(permissionForRoute('POST', '/lessons/abc/cancel')).toBe('schedule.manage');
  });

  it('a method-specific rule beats an any-method one at the same depth', () => {
    expect(permissionForRoute('POST', '/subscriptions/quote')).toBe('subscriptions.view');
    expect(permissionForRoute('POST', '/subscriptions')).toBe('subscriptions.manage');
  });

  it('returns null for an unmapped route', () => {
    expect(permissionForRoute('GET', '/not-a-route')).toBeNull();
    expect(permissionForRoute('GET', '/')).toBeNull();
  });

  it('matches whole segments, not string prefixes', () => {
    expect(permissionForRoute('GET', '/studentsx')).toBeNull();
    expect(permissionForRoute('GET', '/paymentsx')).toBeNull();
  });

  it('a :param in the pattern matches a concrete id and vice versa', () => {
    expect(permissionForRoute('GET', '/students/:id/balance')).toBe('subscriptions.view');
    expect(permissionForRoute('POST', '/lessons/9/room/join')).toBe('classrooms.manage');
  });

  it('uses the rules it is given', () => {
    expect(permissionForRoute('GET', '/x', pair('/x', 'pricing'))).toBe('pricing.view');
  });
});

describe('isExemptRoute', () => {
  it('exempts self-service routes only', () => {
    expect(isExemptRoute('/auth/me')).toBe(true);
    expect(isExemptRoute('/me/push-tokens')).toBe(true);
    expect(isExemptRoute('/activity/session/login')).toBe(true);
    expect(isExemptRoute('/activity')).toBe(false);
    expect(isExemptRoute('/students')).toBe(false);
  });
});

describe('ROUTE_PERMISSIONS', () => {
  it('every rule starts with a slash and names a catalogued permission', () => {
    for (const r of ROUTE_PERMISSIONS) {
      expect(r.prefix.startsWith('/')).toBe(true);
      expect(r.permission).toMatch(/^[a-z_]+\.(view|manage)$/);
    }
  });

  it('GET rules ask for view and write rules for manage', () => {
    for (const r of ROUTE_PERMISSIONS) {
      if (r.method === 'GET') expect(r.permission.endsWith('.view')).toBe(true);
      if (r.method === undefined) expect(r.permission.endsWith('.manage')).toBe(true);
    }
  });
});
