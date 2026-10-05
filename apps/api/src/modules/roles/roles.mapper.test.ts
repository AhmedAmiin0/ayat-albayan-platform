import { describe, expect, it } from 'vitest';
import { copyKey, diffPermissions, toView } from './roles.mapper';

describe('toView', () => {
  it('sorts permissions and drops anything not in the catalogue', () => {
    const row = { id: 'r', key: 'k', name_ar: 'أ', name_en: 'A', base_role: 'admin', is_system: false, created_at: '', updated_at: '' } as const;
    expect(toView(row, ['students.view', 'bogus', 'leads.view'], 2)).toEqual({
      id: 'r', key: 'k', name_ar: 'أ', name_en: 'A', base_role: 'admin', is_system: false,
      permissions: ['leads.view', 'students.view'], user_count: 2,
    });
  });
});

describe('copyKey', () => {
  it('appends _copy, then _copy2, _copy3', () => {
    expect(copyKey('clerk', new Set())).toBe('clerk_copy');
    expect(copyKey('clerk', new Set(['clerk_copy']))).toBe('clerk_copy2');
    expect(copyKey('clerk', new Set(['clerk_copy', 'clerk_copy2']))).toBe('clerk_copy3');
  });

  it('stays within 40 characters', () => {
    const long = 'a'.repeat(40);
    expect(copyKey(long, new Set())).toHaveLength(40);
    expect(copyKey(long, new Set([copyKey(long, new Set())]))).toHaveLength(40);
  });
});

describe('diffPermissions', () => {
  it('returns what to add and what to remove', () => {
    expect(diffPermissions(['inbox.view', 'payments.view'], ['payments.view', 'leads.view'])).toEqual({ add: ['leads.view'], remove: ['inbox.view'] });
  });

  it('is empty when nothing changed', () => {
    expect(diffPermissions(['inbox.view'], ['inbox.view'])).toEqual({ add: [], remove: [] });
  });
});
