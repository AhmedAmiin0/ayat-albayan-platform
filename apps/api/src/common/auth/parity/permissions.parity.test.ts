import { isPermission, systemPermissionsOf, USER_ROLES, type UserRole } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { accessBefore, walkRoutes, type BeforeAccess, type RouteAccess } from './route-walk.test-util';

// THE safety net of dynamic roles: for every endpoint, each of the five system roles (and a user
// with no role) is admitted or refused exactly as under the old @Roles metadata, frozen in
// access-before.json (generated from the app before the conversion, 2026-10-05).
// A new / renamed / removed handler: record it in access-before.json with its intended role set.

type Who = UserRole | null;
const WHO: Who[] = [...USER_ROLES, null];

/** Routes added with dynamic roles (absent from the frozen table). */
const ADDED = /^(Roles|StaffUsers|Users)Controller\./;

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

  // Owner 2026-10-12: an inline check (TemplatesController.list, ThreadSendService), never a route
  // gate, so the frozen table is unchanged; by default only the system admin sends every template.
  it('templates.send_all gates no route and is held by the system admin only', () => {
    expect(routes.filter((r) => r.permission === 'templates.send_all').map((r) => r.key)).toEqual([]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('templates.send_all'))).toEqual(['admin']);
  });

  // Owner 2026-10-12: the start date of POST /sales/subscriptions is an inline check; the registration
  // check is its own route. Both are on for the system sales role (and the admin) by default.
  it('subscriptions.set_start_date gates no route and is held by admin and sales only', () => {
    expect(routes.filter((r) => r.permission === 'subscriptions.set_start_date').map((r) => r.key)).toEqual([]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('subscriptions.set_start_date'))).toEqual(['admin', 'sales']);
  });

  it('students.check_registration gates the registration check only, for admin and sales', () => {
    expect(routes.filter((r) => r.permission === 'students.check_registration').map((r) => r.key)).toEqual(['SalesRegistrationController.check']);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('students.check_registration'))).toEqual(['admin', 'sales']);
  });

  // Owner 2026-10-20 (docs/22): «القوائم» is its own route permission, held by admin and sales only.
  it('inbox.lists gates the chat-lists routes only, for admin and sales (never a teacher)', () => {
    const gated = routes.filter((r) => r.permission === 'inbox.lists').map((r) => r.key);
    expect(gated.length).toBe(6);
    expect(gated.every((k) => k.startsWith('ChatListsController.'))).toBe(true);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('inbox.lists'))).toEqual(['admin', 'sales']);
  });

  // Owner 2026-10-26 «عرض سعر» in the chat: the calculator's two routes, for admin and sales (never a teacher).
  it('pricing.read gates the two pricing routes only, for admin and sales', () => {
    const gated = routes.filter((r) => r.permission === 'pricing.read').map((r) => r.key).sort();
    expect(gated).toEqual(['PricingController.catalog', 'PricingController.quote']);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('pricing.read'))).toEqual(['admin', 'sales']);
  });

  // Owner 2026-10-28 «تأكيد الحلقة»: sales' own confirm route only; the teacher/admin route keeps lessons.status.
  it('lessons.confirm gates the sales confirm route only, for admin and sales (never a teacher)', () => {
    expect(routes.filter((r) => r.permission === 'lessons.confirm').map((r) => r.key)).toEqual(['SalesLessonActionsController.confirm']);
    expect(routes.find((r) => r.key === 'LessonActionsController.confirm')?.permission).toBe('lessons.status');
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('lessons.confirm'))).toEqual(['admin', 'sales']);
  });

  // Owner 2026-10-25 «الردود السريعة»: writing the shared list is an inline check (SavedRepliesService),
  // never a route gate; by default only the system admin holds it (grantable to assistants).
  it('saved_replies.manage gates no route and is held by the system admin only', () => {
    expect(routes.filter((r) => r.permission === 'saved_replies.manage').map((r) => r.key)).toEqual([]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('saved_replies.manage'))).toEqual(['admin']);
  });

  // docs/23 phase 4: notifications.manage gates the rule writes only; the list is settings.read.
  it('notifications.manage gates the two rule PATCH routes only, for the system admin only', () => {
    const gated = routes.filter((r) => r.permission === 'notifications.manage').map((r) => r.key).sort();
    expect(gated).toEqual(['RulesAliasController.update', 'RulesController.update']);
    expect(routes.find((r) => r.key === 'RulesController.overview')?.permission).toBe('settings.read');
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('notifications.manage'))).toEqual(['admin']);
  });

  // docs/23 phase 3: numbers.manage gates the numbers writes and the comms_source switch; reads are settings.read.
  it('numbers.manage gates the numbers writes and the source switch only, for the system admin only', () => {
    const gated = routes.filter((r) => r.permission === 'numbers.manage').map((r) => r.key).sort();
    expect(gated).toEqual([
      'CommunicationsController.setSource', 'NumbersController.clearSecret', 'NumbersController.create', 'NumbersController.import',
      'NumbersController.remove', 'NumbersController.setSecret', 'NumbersController.update',
    ]);
    const reads = routes.filter((r) => r.key === 'NumbersController.list' || r.key === 'CommunicationsController.parity');
    expect(reads.map((r) => r.permission)).toEqual(['settings.read', 'settings.read']);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('numbers.manage'))).toEqual(['admin']);
  });
});
