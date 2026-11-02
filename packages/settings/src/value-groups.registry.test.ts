import { describe, expect, it } from 'vitest';
import type { SettingGroup } from './groups.js';
import { isOwnedSettingKey } from './ownership.js';
import { settingDef, type SettingKey } from './registry.js';
import { OWNED_VALUE_GROUPS, VALUE_CONFIRM, VALUE_GROUPS, type ValueGroupId } from './value-groups.js';

// «القيم» (web + Expo) reads VALUE_GROUPS; 26-P1 put `group` / `confirm` / `ownedBy` on the registry.
// Until the screens read the registry directly, the two must say the same thing.
const REGISTRY_GROUP: Record<ValueGroupId | keyof typeof OWNED_VALUE_GROUPS, SettingGroup> = {
  schedule: 'schedule', classroom: 'classroom', reports: 'reports', accounts: 'accounts', payouts: 'payouts',
  uploads: 'uploads', academy: 'academy', messages: 'messaging', sales: 'sales', retention: 'retention',
  notifications: 'notifications', sending: 'safety',
};

const groups = { ...VALUE_GROUPS, ...OWNED_VALUE_GROUPS } as Record<string, readonly SettingKey[]>;

describe('«القيم» groups agree with the registry', () => {
  it.each(Object.entries(groups))('%s holds the keys the registry puts in its group', (id, keys) => {
    for (const key of keys) expect(settingDef(key).group).toBe(REGISTRY_GROUP[id as ValueGroupId]);
  });

  it('asks the confirmation the registry declares (plain = simple)', () => {
    for (const keys of Object.values(VALUE_GROUPS)) {
      for (const key of keys as readonly SettingKey[]) {
        const mine = VALUE_CONFIRM[key];
        expect(settingDef(key).confirm ?? null).toBe(mine === 'plain' ? 'simple' : (mine ?? null));
      }
    }
  });

  it('never lets «القيم» edit a key the API treats as owned', () => {
    for (const keys of Object.values(VALUE_GROUPS)) for (const key of keys) expect(isOwnedSettingKey(key)).toBe(false);
  });
});
