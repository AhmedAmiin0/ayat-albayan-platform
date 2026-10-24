import { EDITABLE_VALUE_KEYS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { GROUP_IDS, groupKeys, groupLabel, groupOfKey, isOwnedGroup, OWNER_PAGE, resolveGroup } from './value-groups-view';

describe('«القيم» groups', () => {
  it('lists the editable groups, then «قيم مخصصة», then the three module views', () => {
    expect(GROUP_IDS.slice(-4)).toEqual(['custom', 'notifications', 'sending', 'google']);
    expect(GROUP_IDS[0]).toBe('schedule');
    expect(GROUP_IDS.flatMap((id) => (isOwnedGroup(id) ? [] : groupKeys(id)))).toEqual(EDITABLE_VALUE_KEYS);
  });

  it('a missing or unknown group opens the first group', () => {
    expect(resolveGroup(undefined)).toBe('schedule');
    expect(resolveGroup('nope')).toBe('schedule');
    expect(resolveGroup('accounts')).toBe('accounts');
    expect(resolveGroup('google')).toBe('google');
  });

  it('reuses today’s section words and adds the new ones', () => {
    expect(groupLabel('accounts')).toBe(t.settings.sections.accounts);
    expect(groupLabel('custom')).toBe(t.config.sections.custom);
    expect(groupLabel('payouts')).toBe(t.settingsValues.groups.payouts);
    expect(groupLabel('google')).toBe(t.settingsValues.groups.google);
  });

  it('module views link to their page and never hold an editable key', () => {
    expect(OWNER_PAGE.notifications.to).toBe('/admin/settings/communications');
    expect(OWNER_PAGE.notifications.search).toEqual({ tab: 'catalogue' });
    expect(OWNER_PAGE.sending.search).toBeUndefined();
    expect(OWNER_PAGE.google.to).toBe('/admin/settings/google');
    for (const id of ['notifications', 'sending'] as const) {
      for (const key of groupKeys(id)) expect(EDITABLE_VALUE_KEYS).not.toContain(key);
    }
    expect(groupKeys('google')).toEqual([]);
  });

  it('finds the group of a key', () => {
    expect(groupOfKey('fx_fresh_hours')).toBe('accounts');
    expect(groupOfKey('messaging_enabled')).toBe('sending');
  });
});
