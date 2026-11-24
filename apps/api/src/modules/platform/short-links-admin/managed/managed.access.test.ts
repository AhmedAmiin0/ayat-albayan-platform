import { systemPermissionsOf } from '@ab/catalog';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { managedOrThrow, mayManage, ownerScope } from './managed.access';
import { managedRow } from '@/modules/platform/short-links-admin/short-links-admin.fakes';

const as = (id: string, role: 'admin' | 'sales'): AuthUser => ({
  id,
  email: null,
  role,
  permissions: systemPermissionsOf(role),
});
const SALES = '00000000-0000-4000-8000-0000000000b1';
const OTHER = '00000000-0000-4000-8000-0000000000b2';

describe('who manages which link (docs/19: admins see all, sales only their own)', () => {
  it('the system roles: admin and sales hold short_links.manage; only the admin short_links.all', () => {
    expect(systemPermissionsOf('sales')).toContain('short_links.manage');
    expect(systemPermissionsOf('sales')).not.toContain('short_links.all');
    expect(systemPermissionsOf('admin')).toEqual(
      expect.arrayContaining(['short_links.manage', 'short_links.all']),
    );
    expect(systemPermissionsOf('teacher')).not.toContain('short_links.manage');
  });

  it('the list: the admin every owner, a sales user only their own', () => {
    expect(ownerScope(as(OTHER, 'admin'))).toBeNull();
    expect(ownerScope(as(SALES, 'sales'))).toBe(SALES);
  });

  it("a sales user's own link opens; another's is the same 404 as an unknown code", () => {
    const row = managedRow({ created_by: SALES });
    expect(mayManage(as(SALES, 'sales'), row)).toBe(true);
    expect(mayManage(as(OTHER, 'admin'), row)).toBe(true);
    expect(() => managedOrThrow(as(OTHER, 'sales'), row)).toThrow(/short_link_not_found/);
    expect(() => managedOrThrow(as(SALES, 'sales'), null)).toThrow(/short_link_not_found/);
  });
});
