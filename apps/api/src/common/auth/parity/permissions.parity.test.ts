import { isPermission, systemPermissionsOf, USER_ROLES, type UserRole } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { accessBefore, walkRoutes, type BeforeAccess, type RouteAccess } from './route-walk.test-util';

// THE safety net of dynamic roles: for every endpoint, each of the five system roles (and a user
// with no role) is admitted or refused exactly as under the old @Roles metadata, frozen in
// access-before.json (generated from the app before the conversion, 2026-10-05).

type Who = UserRole | null;
const WHO: Who[] = [...USER_ROLES, null];

/** Routes added with dynamic roles (absent from the frozen table). */
const ADDED = /^(Roles|StaffUsers)Controller\./;

function allowedBefore(access: BeforeAccess, who: Who): boolean {
  if (access === 'public') return true;
  if (access === 'signed-in') return true;
  return who !== null && access.includes(who);
}

function allowedAfter(route: RouteAccess, who: Who): boolean {
  if (route.isPublic || route.signedIn) return true;
  if (who === null || !isPermission(route.permission)) return false;
  return systemPermissionsOf(who).includes(route.permission);
}

describe('system-role parity with the old @Roles table', () => {
  const before = accessBefore();
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('still has every endpoint of the frozen table, and only role routes are new', () => {
    const now = new Set(routes.map((r) => r.key));
    expect(Object.keys(before).filter((k) => !now.has(k))).toEqual([]);
    expect(routes.filter((r) => !(r.key in before) && !ADDED.test(r.key)).map((r) => r.key)).toEqual([]);
  });

  it('admits and refuses each system role exactly as before, on every endpoint', () => {
    const diffs: string[] = [];
    for (const route of routes) {
      const was = before[route.key];
      if (was === undefined) continue;
      for (const who of WHO) {
        const a = allowedBefore(was, who);
        const b = allowedAfter(route, who);
        if (a !== b) diffs.push(`${route.key} ${String(who)}: before ${a}, after ${b}`);
      }
    }
    expect(diffs).toEqual([]);
  });

  it('keeps public routes public', () => {
    const pub = Object.entries(before).filter(([, v]) => v === 'public').map(([k]) => k);
    expect(routes.filter((r) => r.isPublic).map((r) => r.key).sort()).toEqual(pub.sort());
  });

  it('gives the new role routes to the system admin only', () => {
    const added = routes.filter((r) => ADDED.test(r.key));
    for (const who of WHO) {
      const allowed = added.filter((r) => allowedAfter(r, who)).length;
      expect([who, allowed]).toEqual([who, who === 'admin' ? added.length : 0]);
    }
  });
});
