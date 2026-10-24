import { INTEGRATION_GROUPS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import {
  groupsMatch,
  INTEGRATIONS_PAGE_GROUPS,
  KAPSO_GROUPS,
  LEGACY_LINE_GROUPS,
  SAFETY_GROUPS,
  SAFETY_GUARD_GROUPS,
} from './integration-places';

const keys = t.integrations.keys;

describe('where each integrations group lives', () => {
  it('every group has exactly one place', () => {
    const placed = [...SAFETY_GROUPS, ...LEGACY_LINE_GROUPS, ...INTEGRATIONS_PAGE_GROUPS];
    expect([...placed].sort()).toEqual([...INTEGRATION_GROUPS].sort());
  });

  it('«الحماية» is its two columns: the test guards, then Kapso', () => {
    expect(SAFETY_GROUPS).toEqual([...SAFETY_GUARD_GROUPS, ...KAPSO_GROUPS]);
    expect(SAFETY_GUARD_GROUPS).toEqual(['wa_safety']);
    expect(KAPSO_GROUPS).toEqual(['kapso']);
  });

  it('a search matches only the keys of the given groups', () => {
    expect(groupsMatch(SAFETY_GROUPS)(keys.WA_ALLOWED_RECIPIENTS.label)).toBe(true);
    expect(groupsMatch(SAFETY_GROUPS)('KAPSO_API_KEY')).toBe(true);
    expect(groupsMatch(INTEGRATIONS_PAGE_GROUPS)('KAPSO_API_KEY')).toBe(false);
    expect(groupsMatch(INTEGRATIONS_PAGE_GROUPS)(keys.FX_API_URL.label)).toBe(true);
    expect(groupsMatch(LEGACY_LINE_GROUPS)('WA_CHAT_PROVIDER')).toBe(true);
    expect(groupsMatch(SAFETY_GROUPS)('zzzz-nothing')).toBe(false);
  });
});
