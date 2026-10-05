import { describe, expect, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import {
  ALL_PERMISSIONS,
  can,
  canAny,
  EDITOR_MODULES,
  isPermission,
  PERMISSION_GROUPS,
  PERMISSION_MODULES,
  RESERVED_MODULES,
} from './catalogue.js';

type Dict = { roles: { module: Record<string, string>; perm: Record<string, Record<string, string>> } };

describe('catalogue', () => {
  it('has a view and a manage permission per module, plus the wildcard', () => {
    expect(ALL_PERMISSIONS).toHaveLength(PERMISSION_MODULES.length * 2 + 1);
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    expect(ALL_PERMISSIONS.at(-1)).toBe('*');
  });

  it('contains every module the owner asked for', () => {
    for (const m of ['leads', 'inbox', 'job_applicants', 'students', 'teachers', 'schedule', 'classrooms', 'feedback',
      'subscriptions', 'payments', 'payouts', 'expenses', 'invoices', 'receivables', 'finance', 'pricing', 'settings',
      'dashboard', 'activity', 'users', 'roles', 'translations', 'recordings']) {
      expect(PERMISSION_MODULES).toContain(m);
    }
  });

  it('groups the catalogue as view/manage rows', () => {
    expect(PERMISSION_GROUPS).toHaveLength(EDITOR_MODULES.length);
    expect(PERMISSION_GROUPS[0]).toEqual({ module: 'leads', view: 'leads.view', manage: 'leads.manage' });
  });

  it('hides the reserved users module from the editor but keeps it in the catalogue', () => {
    expect(RESERVED_MODULES).toEqual(['users']);
    expect(PERMISSION_GROUPS.map((g) => g.module)).not.toContain('users');
    expect(ALL_PERMISSIONS).toContain('users.manage');
  });

  it('isPermission accepts catalogue keys only', () => {
    expect(isPermission('leads.view')).toBe(true);
    expect(isPermission('*')).toBe(true);
    for (const v of ['leads', 'leads.delete', '', null, 1, 'x.view']) expect(isPermission(v)).toBe(false);
  });
});

describe.each([
  ['ar', ar as unknown as Dict],
  ['en', en as unknown as Dict],
])('i18n labels (%s)', (_lang, dict) => {
  it('labels every module', () => {
    for (const m of PERMISSION_MODULES) expect(dict.roles.module[m]?.trim()).toBeTruthy();
  });

  it('labels every catalogued permission', () => {
    for (const g of PERMISSION_GROUPS) {
      expect(dict.roles.perm[g.module]?.['view']?.trim(), g.view).toBeTruthy();
      expect(dict.roles.perm[g.module]?.['manage']?.trim(), g.manage).toBeTruthy();
    }
  });

  it('has no label for a permission that is not catalogued', () => {
    expect(Object.keys(dict.roles.perm).sort()).toEqual([...PERMISSION_MODULES].sort());
  });
});

describe('can()', () => {
  it('the wildcard grants everything', () => {
    expect(can(['*'], 'payments.manage')).toBe(true);
    expect(can(new Set(['*']), 'roles.view')).toBe(true);
  });

  it('grants exactly what is listed', () => {
    expect(can(['leads.view'], 'leads.view')).toBe(true);
    expect(can(['leads.view'], 'leads.manage')).toBe(false);
    expect(can(['leads.view'], 'inbox.view')).toBe(false);
  });

  it('manage implies view of the same module only', () => {
    expect(can(['students.manage'], 'students.view')).toBe(true);
    expect(can(['students.manage'], 'teachers.view')).toBe(false);
  });

  it('denies an empty set and works with a Set', () => {
    expect(can([], 'leads.view')).toBe(false);
    expect(can(new Set(['leads.view']), 'leads.view')).toBe(true);
  });

  it('canAny needs one match', () => {
    expect(canAny(['leads.view'], ['inbox.view', 'leads.view'])).toBe(true);
    expect(canAny(['leads.view'], ['inbox.view'])).toBe(false);
    expect(canAny(['leads.view'], [])).toBe(false);
  });
});
