import { systemPermissionsOf, USER_ROLES } from '@ab/shared';
import { beforeAll, describe, expect, it } from 'vitest';
import { accessBefore, walkRoutes, type RouteAccess } from './route-walk.test-util';

// Owner 2026-10-29 «رقم ثانٍ للعائلة»: linking a lead chat's number to a family is its own key, the admin's only
// by default (grantable from the matrix, never a sales default); removing a second number is guardians.write.
describe('«رقم ثانٍ للعائلة» routes', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('leads.link_family gates POST /leads/:id/link-family only, held by the system admin only', () => {
    expect(routes.filter((r) => r.permission === 'leads.link_family').map((r) => r.key)).toEqual(['LeadFamilyController.link']);
    expect(USER_ROLES.filter((who) => systemPermissionsOf(who).includes('leads.link_family'))).toEqual(['admin']);
  });

  it('removing a second number is the admin guardians.write route, recorded in the frozen table', () => {
    expect(routes.find((r) => r.key === 'GuardiansController.removePhone')?.permission).toBe('guardians.write');
    expect(accessBefore()['GuardiansController.removePhone']).toEqual(['admin']);
    expect(accessBefore()['LeadFamilyController.link']).toEqual(['admin']);
  });
});
