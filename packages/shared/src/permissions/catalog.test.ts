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
    expect(selfPermissionsOf('sales')).toEqual(['self.sales']);
    expect(selfPermissionsOf('assistant')).toEqual(['self.assistant']);
    expect(systemPermissionsOf('sales')).toContain('inbox.read');
    expect(systemPermissionsOf('assistant')).not.toContain('inbox.read');
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
