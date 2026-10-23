import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS, SETTING_KEYS, SETTINGS_REGISTRY } from './registry.js';

// SettingsService.write deletes the row when a PATCH sends null, so the value read back is the
// default: a nullable entry must therefore default to null (OFF / unset), or null would not stick.
describe('nullable settings', () => {
  const nullable = SETTING_KEYS.filter((k) => (SETTINGS_REGISTRY[k] as { nullable?: boolean }).nullable === true);

  it('are the policies that can be OFF or unset', () => {
    expect(nullable.sort()).toEqual(['late_cancel_hours', 'recording_consent_notice', 'recording_retention_days']);
  });

  it('every nullable entry defaults to null', () => {
    for (const key of nullable) {
      expect([key, SETTINGS_REGISTRY[key].default]).toEqual([key, null]);
      expect([key, SETTING_DEFAULTS[key]]).toEqual([key, null]);
    }
  });

  it('no other entry defaults to null', () => {
    const others = SETTING_KEYS.filter((k) => !nullable.includes(k) && SETTING_DEFAULTS[k] === null);
    expect(others).toEqual([]);
  });
});
