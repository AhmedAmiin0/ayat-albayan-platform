import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS, SETTINGS_REGISTRY } from '../registry.js';
import { settingZod, storedSettingZod } from './schema.js';
import { isValidSetting, readSettings } from './validate.js';

// docs/36 z3: the read side is the PATCH schema (settingZod) minus its trim. A stored string that
// is not already trimmed reads as the default, exactly like the old hand-written CHECKS table.
describe('storedSettingZod', () => {
  const title = SETTINGS_REGISTRY.default_meeting_title;

  it('the PATCH trims a padded string; the read side refuses it', () => {
    expect(settingZod(title).parse('  Halaqa  ')).toBe('Halaqa');
    expect(storedSettingZod(title).safeParse('  Halaqa  ').success).toBe(false);
    expect(readSettings([{ key: 'default_meeting_title', value: ' Halaqa' }]).default_meeting_title)
      .toBe(SETTING_DEFAULTS.default_meeting_title);
  });

  it('a trimmed string in range is kept as stored', () => {
    expect(readSettings([{ key: 'default_meeting_title', value: 'Halaqa' }]).default_meeting_title)
      .toBe('Halaqa');
  });

  it.each([
    ['academy_timezone', ''],
    ['academy_timezone', 3],
    ['join_opens_before_min', 10.5],
    ['join_opens_before_min', Number.NaN],
    ['follow_up_hours', []],
    ['follow_up_hours', [24, 24]],
    ['follow_up_hours', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]],
    ['feedback_mode', 1],
    ['academy_contact', { site: 'example.com', extra: 'x' }],
    ['feedback_mode', null],
  ])('%s = %j reads as the default', (key, value) => {
    expect(readSettings([{ key, value }])).toEqual(SETTING_DEFAULTS);
  });

  it('valid stored values of each kind are kept', () => {
    expect(isValidSetting(SETTINGS_REGISTRY.academy_timezone, 'Africa/Cairo')).toBe(true);
    expect(isValidSetting(SETTINGS_REGISTRY.follow_up_hours, [24, 48])).toBe(true);
    expect(isValidSetting(SETTINGS_REGISTRY.reporting_currency, 'EGP')).toBe(true);
    expect(isValidSetting(SETTINGS_REGISTRY.meeting_link_auto, false)).toBe(true);
    expect(isValidSetting(SETTINGS_REGISTRY.academy_contact, {})).toBe(true);
    expect(isValidSetting(SETTINGS_REGISTRY.late_cancel_hours, null)).toBe(true);
  });
});
