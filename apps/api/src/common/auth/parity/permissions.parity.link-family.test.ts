import { systemPermissionsOf, USER_ROLES } from '@ab/catalog';
import { beforeAll, describe, expect, it } from 'vitest';
import { accessBefore, permissionKeys, walkRoutes, type RouteAccess } from './route-walk.test-util';

// Linking a chat's number to a family is its own admin-only key; removing one is guardians.write.
describe('«رقم ثانٍ للعائلة» routes', () => {
  let routes: RouteAccess[];
  beforeAll(async () => {
    routes = await walkRoutes();
  }, 60_000);

  it('leads.link_family gates POST /leads/:id/link-family only, held by the system admin only', () => {
    const gated = routes.filter((r) => permissionKeys(r).includes('leads.link_family'));
    expect(gated.map((r) => r.key)).toEqual(['LeadFamilyController.link']);
    expect(USER_ROLES.filter((who) => systemPermissionsOf(who).includes('leads.link_family'))).toEqual(['admin']);
  });

  it('removing a second number is the admin guardians.write route, recorded in the frozen table', () => {
    expect(routes.find((r) => r.key === 'GuardiansController.removePhone')?.permission).toBe('guardians.write');
    expect(accessBefore()['GuardiansController.removePhone']).toEqual(['admin']);
    expect(accessBefore()['LeadFamilyController.link']).toEqual(['admin']);
  });
});
