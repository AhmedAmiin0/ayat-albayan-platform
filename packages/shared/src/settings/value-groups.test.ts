import { describe, expect, it } from 'vitest';
import { SETTING_KEYS } from './registry.js';
import { EDITABLE_VALUE_KEYS, isEditableValueKey, OWNED_VALUE_GROUPS, VALUE_CONFIRM, VALUE_GROUPS } from './value-groups.js';

describe('«القيم» groups', () => {
  const owned: readonly string[] = Object.values(OWNED_VALUE_GROUPS).flat();

  it('place every settings key exactly once, editable or owned (38 + 12 = 50)', () => {
    expect(EDITABLE_VALUE_KEYS).toHaveLength(38);
    expect(owned).toHaveLength(12);
    expect([...EDITABLE_VALUE_KEYS, ...owned].sort()).toEqual([...SETTING_KEYS].sort());
  });

  it('never let «القيم» edit a module-owned key', () => {
    for (const key of owned) expect(isEditableValueKey(key)).toBe(false);
    expect(isEditableValueKey('not_a_key')).toBe(false);
    expect(isEditableValueKey('booking_horizon_weeks')).toBe(true);
  });

  it('keep no group longer than 8 rows (one screen per view)', () => {
    for (const keys of [...Object.values(VALUE_GROUPS), ...Object.values(OWNED_VALUE_GROUPS)]) {
      expect(keys.length).toBeLessThanOrEqual(8);
    }
  });

  it('ask before every confirmed key, typed for the two retention values', () => {
    expect(VALUE_CONFIRM.recording_retention_days).toBe('typed');
    expect(VALUE_CONFIRM.activity_retention_days).toBe('typed');
    for (const key of Object.keys(VALUE_CONFIRM)) expect(isEditableValueKey(key)).toBe(true);
  });
});
