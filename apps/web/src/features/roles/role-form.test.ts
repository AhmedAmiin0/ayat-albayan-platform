import { describe, expect, it } from 'vitest';
import type { RoleView } from './api';
import { groupState, resettableRole, roleBody, roleForm, toggleGroup, togglePermission } from './role-form';

const role = (over: Partial<RoleView> = {}): RoleView => ({
  id: 'r1',
  key: 'custom-1',
  name_ar: 'محاسب',
  name_en: null,
  base_role: 'admin',
  is_system: false,
  permissions: ['payments.read'],
  users: 0,
  ...over,
});

describe('role form', () => {
  it('starts empty for a new role and from the role when editing', () => {
    expect(roleForm(null)).toEqual({ name_ar: '', name_en: '', base_role: 'admin', permissions: [] });
    expect(roleForm(role())).toMatchObject({ name_ar: 'محاسب', permissions: ['payments.read'] });
  });

  it('toggles one permission and keeps catalog order', () => {
    const f = togglePermission(roleForm(role()), 'students.read');
    expect(f.permissions).toEqual(['students.read', 'payments.read']);
    expect(togglePermission(f, 'students.read').permissions).toEqual(['payments.read']);
  });

  it('«تحديد الكل» selects a whole area, then clears it', () => {
    const keys = ['payments.read', 'payments.write'] as const;
    expect(groupState(['payments.read'], keys)).toBe('some');
    const all = toggleGroup(roleForm(role()), keys);
    expect(groupState(all.permissions, keys)).toBe('all');
    expect(toggleGroup(all, keys).permissions).toEqual([]);
    expect(groupState([], keys)).toBe('none');
  });

  it('builds the POST and PATCH bodies; the base role is sent only on create', () => {
    const form = { ...roleForm(null), name_ar: ' محاسب ', permissions: ['payments.read' as const] };
    expect(roleBody(form, { creating: true, fixedGrants: false })).toEqual({
      ok: true,
      body: { name_ar: 'محاسب', name_en: null, base_role: 'admin', permissions: ['payments.read'] },
    });
    expect(roleBody(form, { creating: false, fixedGrants: false })).toEqual({
      ok: true,
      body: { name_ar: 'محاسب', name_en: null, permissions: ['payments.read'] },
    });
    expect(roleBody(form, { creating: false, fixedGrants: true })).toEqual({ ok: true, body: { name_ar: 'محاسب', name_en: null } });
    expect(roleBody({ ...form, name_ar: '  ' }, { creating: true, fixedGrants: false })).toEqual({ ok: false, error: 'name_required' });
  });

  it('only a system teacher / sales / assistant role can be reset', () => {
    const sales = role({ key: 'sales', is_system: true, base_role: 'sales' });
    expect(resettableRole(sales)).toBe(sales);
    expect(resettableRole(role({ key: 'admin', is_system: true }))).toBeNull();
    expect(resettableRole(role())).toBeNull();
    expect(resettableRole(null)).toBeNull();
  });
});
