import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import {
  defaultGrantsOf,
  effectivePermissions,
  GRANTABLE_PERMISSIONS,
  isGrantable,
  isPermission,
  PERMISSION_AREAS,
  PERMISSIONS,
  permissionGroups,
  selfPermissionsOf,
  systemPermissionsOf,
} from './catalog.js';

describe('permission catalog', () => {
  it('has unique resource.action keys', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
    for (const p of PERMISSIONS) expect(p).toMatch(/^[a-z]+\.[a-z_]+$/);
  });

  it('labels every key and every area in Arabic and English', () => {
    for (const dict of [ar, en]) {
      const items: Record<string, string> = dict.permissions.items;
      const areas: Record<string, string> = dict.permissions.areas;
      expect(PERMISSIONS.filter((p) => !items[p]?.trim())).toEqual([]);
      expect(PERMISSION_AREAS.filter((a) => a !== 'self' && !areas[a]?.trim())).toEqual([]);
      expect(Object.keys(items).filter((k) => !isPermission(k))).toEqual([]);
    }
  });

  it('keeps self.* out of the grantable list and the matrix', () => {
    expect(GRANTABLE_PERMISSIONS.some((p) => p.startsWith('self.'))).toBe(false);
    expect(isGrantable('self.teacher')).toBe(false);
    expect(isGrantable('payments.read')).toBe(true);
    const shown = permissionGroups().flatMap((g) => g.keys);
    expect(shown.sort()).toEqual([...GRANTABLE_PERMISSIONS].sort());
  });
});

describe('system roles', () => {
  it('admin holds every grantable key and no self scope', () => {
    expect(systemPermissionsOf('admin').sort()).toEqual([...GRANTABLE_PERMISSIONS].sort());
  });

  it('teacher keeps its own pages and today’s shared ones', () => {
    const t = systemPermissionsOf('teacher');
    expect(t).toEqual(expect.arrayContaining(['self.teacher', 'reports.write', 'inbox.send', 'classroom.host']));
    expect(t).not.toContain('students.read');
    expect(t).not.toContain('payments.read');
  });

  it('guardian holds nothing', () => {
    expect(systemPermissionsOf('guardian')).toEqual([]);
    expect(defaultGrantsOf('guardian')).toEqual([]);
  });

  it('sales and assistant carry only their scope keys and the shared rooms/inbox', () => {
    expect(selfPermissionsOf('sales')).toEqual(['self.sales', 'self.sales_students', 'self.sales_payments', 'self.sales_earnings', 'self.sales_academy']);
    expect(selfPermissionsOf('assistant')).toEqual(['self.assistant']);
    expect(systemPermissionsOf('sales')).toContain('inbox.read');
    expect(systemPermissionsOf('assistant')).not.toContain('inbox.read');
  });
});

describe('assistant pay permissions', () => {
  it('are admin-only grants (no system role but the admin holds them) and the scope keys only follow the sales base role', () => {
    const keys = ['assistantpay.read', 'assistantpay.write', 'assistantpay.approve'] as const;
    for (const k of keys) {
      expect(isGrantable(k)).toBe(true);
      expect(systemPermissionsOf('admin')).toContain(k);
      for (const role of ['teacher', 'assistant', 'sales'] as const) expect(systemPermissionsOf(role)).not.toContain(k);
    }
    for (const k of ['self.sales_students', 'self.sales_payments', 'self.sales_earnings', 'self.sales_academy'] as const) {
      expect(isGrantable(k)).toBe(false);
      expect(systemPermissionsOf('sales')).toContain(k);
      expect(systemPermissionsOf('admin')).not.toContain(k);
      expect(systemPermissionsOf('teacher')).not.toContain(k);
    }
  });
});

describe('effectivePermissions', () => {
  it('drops unknown and self.* rows and adds the base role scope', () => {
    const out = effectivePermissions({ baseRole: 'admin', granted: ['payments.read', 'nope', 'self.teacher'], allGrantable: false });
    expect(out).toEqual(['payments.read']);
    const t = effectivePermissions({ baseRole: 'teacher', granted: [], allGrantable: false });
    expect(t).toEqual(['self.teacher']);
  });

  it('gives nothing without a base role', () => {
    expect(effectivePermissions({ baseRole: null, granted: ['payments.read'], allGrantable: true })).toEqual([]);
  });
});

describe('student and guardian base roles', () => {
  it('hold no permission at all until the portal task grants self.* keys', () => {
    expect(systemPermissionsOf('student')).toEqual([]);
    expect(systemPermissionsOf('guardian')).toEqual([]);
    expect(defaultGrantsOf('student')).toEqual([]);
  });
  it('only the system admin holds the users permissions by default', () => {
    expect(systemPermissionsOf('admin')).toEqual(expect.arrayContaining(['users.read', 'users.write']));
    for (const role of ['teacher', 'assistant', 'sales', 'guardian', 'student'] as const) {
      expect(systemPermissionsOf(role)).not.toContain('users.read');
      expect(systemPermissionsOf(role)).not.toContain('users.write');
    }
  });
});
