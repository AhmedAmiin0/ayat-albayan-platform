import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { roleLabel } from './role-label';

describe('roleLabel (R-ACC-01), Arabic UI', () => {
  it('the custom role name in Arabic, else English, else the base role', () => {
    expect(roleLabel({ base: 'sales', key: 'k', name_ar: 'مسوّق', name_en: 'Marketer' })).toBe('مسوّق');
    expect(roleLabel({ base: 'sales', key: 'k', name_ar: null, name_en: 'Marketer' })).toBe('Marketer');
    expect(roleLabel({ base: 'guardian', key: null, name_ar: null, name_en: null })).toBe(t.activity.roles.guardian);
    expect(roleLabel({ base: null, key: null, name_ar: ' ', name_en: null })).toBe(t.activity.roles.unknown);
  });
});
