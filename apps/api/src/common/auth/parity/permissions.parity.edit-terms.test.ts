import { systemPermissionsOf, USER_ROLES } from '@ab/catalog';
import { beforeAll, describe, expect, it } from 'vitest';
import { walkRoutes, type RouteAccess } from './route-walk.test-util';

// edit_terms gates every change to an existing package; set_start_date is an inline check only.
describe('subscriptions.edit_terms', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('gates the used-before, start-date and assistant amount editors only', () => {
    expect(routes.filter((r) => r.permission === 'subscriptions.set_start_date')).toEqual([]);
    const gated = routes.filter((r) => r.permission === 'subscriptions.edit_terms');
    expect(gated.map((r) => r.key).sort()).toEqual([
      'SalesPaymentsController.editAmount',
      'StartDateEditController.edit',
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
