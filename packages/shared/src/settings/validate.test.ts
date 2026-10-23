import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTING_DEFAULTS, PUBLIC_SETTING_KEYS, publicSettings } from './public.js';
import { SETTING_DEFAULTS, SETTINGS_REGISTRY } from './registry.js';
import { isValidSetting, readSettings } from './validate.js';

describe('readSettings', () => {
  it('fills defaults for missing rows; valid stored values win', () => {
    const s = readSettings([
      { key: 'join_opens_before_min', value: 30 },
      { key: 'academy_whatsapp_e164', value: '+201001234567' },
    ]);
    expect(s).toEqual({ ...SETTING_DEFAULTS, join_opens_before_min: 30, academy_whatsapp_e164: '+201001234567' });
  });

  it.each([
    ['join_opens_before_min', 181],
    ['join_closes_after_min', '120'],
    ['upload_max_mb', 50],
    ['academy_whatsapp_e164', '0566101447'],
    ['academy_timezone', 'Nowhere/City'],
    ['default_meeting_title', ''],
    ['late_cancel_hours', -1],
    ['follow_up_hours', [72, 24]],
    ['feedback_mode', 'both'],
    ['reporting_currency', 'sar'],
    ['meeting_link_auto', 'true'],
  ])('malformed %s = %j reads as the default', (key, value) => {
    expect(readSettings([{ key, value }])).toEqual(SETTING_DEFAULTS);
  });

  it('a JSON null is valid only for nullable entries', () => {
    expect(isValidSetting(SETTINGS_REGISTRY.late_cancel_hours, null)).toBe(true);
    expect(isValidSetting(SETTINGS_REGISTRY.recording_consent_notice, null)).toBe(true);
    expect(isValidSetting(SETTINGS_REGISTRY.booking_horizon_weeks, null)).toBe(false);
    expect(isValidSetting(SETTINGS_REGISTRY.academy_contact, null)).toBe(false);
  });
});

describe('public settings', () => {
  it('only the public keys go out, with their defaults before the API answers', () => {
    expect([...PUBLIC_SETTING_KEYS].sort()).toEqual(
      [
        'academy_contact', 'academy_whatsapp_e164', 'join_closes_after_min', 'join_opens_before_min',
        'makeup_window_days', 'meeting_link_auto', 'recording_consent_notice', 'upload_max_mb',
      ].sort(),
    );
    expect(publicSettings({ ...SETTING_DEFAULTS, messaging_enabled: true })).toEqual(PUBLIC_SETTING_DEFAULTS);
    expect(PUBLIC_SETTING_DEFAULTS).not.toHaveProperty('messaging_enabled');
  });
});
