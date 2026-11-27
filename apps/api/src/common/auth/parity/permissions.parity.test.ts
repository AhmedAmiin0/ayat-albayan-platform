import { isPermission, systemPermissionsOf, USER_ROLES, type UserRole } from '@ab/catalog';
import { beforeAll, describe, expect, it } from 'vitest';
import { accessBefore, permissionKeys, walkRoutes, type BeforeAccess, type RouteAccess } from './route-walk.test-util';

// THE safety net of dynamic roles: for every endpoint, each of the five system roles (and a user
// with no role) is admitted or refused exactly as under the old @Roles metadata, frozen in
// access-before.json (generated from the app before the conversion).
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
  if (who === null) return false;
  const held = (k: unknown) => isPermission(k) && systemPermissionsOf(who).includes(k);
  return [route.permission ?? []].flat().some(held);
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
    expect(
      routes.filter((r) => !(r.key in before) && !ADDED.test(r.key)).map((r) => r.key),
    ).toEqual([]);
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

  // An inline check (TemplatesController.list, ThreadSendService), never a route
  // gate, so the frozen table is unchanged; by default only the system admin sends every template.
  it('templates.send_all gates no route and is held by the system admin only', () => {
    expect(routes.filter((r) => r.permission === 'templates.send_all').map((r) => r.key)).toEqual([]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('templates.send_all'))).toEqual(['admin']);
  });

  it('students.check_registration gates the registration check only, for admin and sales', () => {
    expect(routes.filter((r) => permissionKeys(r).includes('students.check_registration')).map((r) => r.key)).toEqual(['SalesRegistrationController.check']);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('students.check_registration'))).toEqual(['admin', 'sales']);
  });

  // The chat lists are their own route permission, admin and sales only (docs/22).
  it('inbox.lists gates the chat-lists routes only, for admin and sales (never a teacher)', () => {
    const gated = routes.filter((r) => [r.permission].flat().includes('inbox.lists')).map((r) => r.key);
    expect(gated.length).toBe(6);
    expect(gated.every((k) => k.startsWith('ChatListsController.'))).toBe(true);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('inbox.lists'))).toEqual(['admin', 'sales']);
  });

  it('pricing.read gates the pricing routes only, for admin and sales', () => {
    const gated = routes.filter((r) => r.permission === 'pricing.read').map((r) => r.key).sort();
    expect(gated).toEqual(['catalog', 'list', 'quote'].map((h) => `PricingController.${h}`));
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('pricing.read'))).toEqual(['admin', 'sales']);
  });

  // Sales has its own confirm route; the teacher and admin route keeps lessons.status.
  it('lessons.confirm gates the sales confirm route only, for admin and sales (never a teacher)', () => {
    expect(routes.filter((r) => permissionKeys(r).includes('lessons.confirm')).map((r) => r.key)).toEqual(['SalesLessonActionsController.confirm']);
    expect(routes.filter((r) => r.key === 'LessonActionsController.confirm').map(permissionKeys)).toEqual([['lessons.status']]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('lessons.confirm'))).toEqual(['admin', 'sales']);
  });

  // Course pause has its own routes only, admin and sales (docs/16 row 37c).
  it('courses.pause gates exactly the course pause routes, for admin and sales', () => {
    const keys = routes.filter((r) => r.permission === 'courses.pause').map((r) => r.key).sort();
    // Resume previews what it does before acting (resumePreview).
    const handlers = ['preview', 'resume', 'resumePreview', 'start', 'state', 'until'];
    expect(keys).toEqual(handlers.map((h) => `CoursePauseController.${h}`));
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('courses.pause'))).toEqual(['admin', 'sales']);
  });

  // An inline check of the sales money scope, held by the admin only.
  it('sales.renew_any gates no route and is held by the system admin only (never sales by default)', () => {
    expect(routes.filter((r) => r.permission === 'sales.renew_any').map((r) => r.key)).toEqual([]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('sales.renew_any'))).toEqual(['admin']);
  });

  // Writing saved replies is an inline service check, never a route gate; admin only by default.
  it('saved_replies.manage gates no route and is held by the system admin only', () => {
    expect(routes.filter((r) => r.permission === 'saved_replies.manage').map((r) => r.key)).toEqual([]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('saved_replies.manage'))).toEqual(['admin']);
  });

  // docs/23 phase 4: notifications.manage gates the rule writes only; the list is settings.read.
  it('notifications.manage gates the two rule PATCH routes only, for the system admin only', () => {
    const gated = routes.filter((r) => permissionKeys(r).includes('notifications.manage'));
    expect(gated.map((r) => r.key).sort()).toEqual(['RulesAliasController.update', 'RulesController.update']);
    expect(routes.filter((r) => r.key === 'RulesController.overview').map(permissionKeys)).toEqual([['settings.read']]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('notifications.manage'))).toEqual(['admin']);
  });

  // docs/23 phase 3: numbers.manage gates the numbers writes and the comms_source switch; reads are
  // settings.read.
  it('numbers.manage gates the numbers writes and the source switch only, for the system admin only', () => {
    const gated = routes.filter((r) => permissionKeys(r).includes('numbers.manage'));
    expect(gated.map((r) => r.key).sort()).toEqual([
      'CommunicationsController.setSource',
      // Every Evolution option, saved and pushed to the instance.
      'EvolutionConfigController.config', 'EvolutionConfigController.push', 'EvolutionConfigController.verify',
      'NumbersController.clearSecret', 'NumbersController.create', 'NumbersController.import',
      'NumbersController.remove', 'NumbersController.setSecret', 'NumbersController.update',
      // docs/19 «Evolution driver»: the QR links a WhatsApp account (state: a manage read too).
      'NumbersEvolutionController.qr', 'NumbersEvolutionController.state',
    ]);
    const reads = routes.filter((r) => r.key === 'NumbersController.list' || r.key === 'CommunicationsController.parity');
    expect(reads.map(permissionKeys)).toEqual([['settings.read'], ['settings.read']]);
    expect(WHO.filter((who) => who !== null && systemPermissionsOf(who).includes('numbers.manage'))).toEqual(['admin']);
  });
});
