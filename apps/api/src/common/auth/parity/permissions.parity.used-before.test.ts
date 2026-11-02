import { systemPermissionsOf, USER_ROLES } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes, type RouteAccess } from './route-walk.test-util';

// Owner 2026-10-12: the start date of POST /sales/subscriptions is an inline check. Owner
// 2026-11-02: subscriptions.set_start_date also gates «تعديل عدد الحلقات المستخدمة»
// (GET / PATCH /subscriptions/:id/lessons-used-before). Admin and sales by default only.
describe('subscriptions.set_start_date', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('gates the used-before editor only', () => {
    const gated = routes.filter((r) => r.permission === 'subscriptions.set_start_date');
    expect(gated.map((r) => r.key).sort()).toEqual([
      'UsedBeforeEditController.edit',
      'UsedBeforeEditController.state',
    ]);
  });

  it('is held by the system admin and sales only', () => {
    const holders = USER_ROLES.filter((who) =>
      systemPermissionsOf(who).includes('subscriptions.set_start_date'),
    );
    expect(holders).toEqual(['admin', 'sales']);
  });
});
