import { systemPermissionsOf, USER_ROLES } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes, type RouteAccess } from './route-walk.test-util';

// Owner 2026-10-12: the start date of POST /sales/subscriptions is an inline check of
// subscriptions.set_start_date (no route). Owner 2026-11-03: subscriptions.edit_terms gates every
// change to an existing package, «تعديل عدد الحلقات المستخدمة» (GET / PATCH
// /subscriptions/:id/lessons-used-before) included. The system admin only by default.
describe('subscriptions.edit_terms', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('gates the used-before editor only', () => {
    expect(routes.filter((r) => r.permission === 'subscriptions.set_start_date')).toEqual([]);
    const gated = routes.filter((r) => r.permission === 'subscriptions.edit_terms');
    expect(gated.map((r) => r.key).sort()).toEqual([
      'UsedBeforeEditController.edit',
      'UsedBeforeEditController.state',
    ]);
  });

  it('is held by the system admin only (sales keeps subscriptions.set_start_date)', () => {
    const holders = USER_ROLES.filter((who) =>
      systemPermissionsOf(who).includes('subscriptions.edit_terms'),
    );
    expect(holders).toEqual(['admin']);
    expect(systemPermissionsOf('sales')).toContain('subscriptions.set_start_date');
  });
});
