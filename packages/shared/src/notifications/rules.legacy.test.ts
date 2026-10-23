import { describe, expect, it } from 'vitest';
import { SETTING_DEFAULTS } from '../settings/index.js';
import { NOTIFICATION_KEYS } from './catalogue.js';
import { defaultTiming } from './rules.effective.js';
import { legacyParts, legacyValues, RULE_LEGACY_MAP, RULE_SETTING_KEYS, type RuleSettings } from './rules.legacy.js';

const defaults = Object.fromEntries(RULE_SETTING_KEYS.map((k) => [k, SETTING_DEFAULTS[k]])) as RuleSettings;
const custom: RuleSettings = {
  reminder_minutes_before: 45,
  reminder_24h_enabled: true,
  teacher_whatsapp_new_student: false,
  teacher_whatsapp_lesson_reminder: false,
  follow_up_hours: [12, 48],
  follow_up_slots_from_hours: 6,
  follow_up_slots_to_days: 3,
  feedback_mode: 'link',
};

describe('RULE_LEGACY_MAP', () => {
  it('maps every rule key exactly once, to catalogue rows; renewal_alert_remaining is not one', () => {
    const mapped = Object.values(RULE_LEGACY_MAP).flatMap((m) => [...('enabled' in m ? m.enabled : []), ...('timing' in m ? m.timing : [])]);
    expect([...mapped].sort()).toEqual([...RULE_SETTING_KEYS].sort());
    expect(Object.keys(RULE_LEGACY_MAP).every((k) => (NOTIFICATION_KEYS as readonly string[]).includes(k))).toBe(true);
    expect(RULE_SETTING_KEYS as readonly string[]).not.toContain('renewal_alert_remaining');
  });

  it('round-trips: legacyValues(legacyParts(s)) gives s back, for defaults and custom values', () => {
    for (const s of [defaults, custom]) {
      const back = Object.keys(RULE_LEGACY_MAP).reduce<Partial<RuleSettings>>((acc, key) => {
        const parts = legacyParts(key, s);
        const rule = { enabled: parts.enabled ?? true, timing: parts.timing ?? defaultTiming(key, s) };
        return { ...acc, ...legacyValues(key, rule) };
      }, {});
      expect(back).toEqual(s);
    }
  });

  it('unmapped rows have no legacy parts and write nothing', () => {
    expect(legacyParts('booking_confirmation', custom)).toEqual({});
    expect(legacyValues('booking_confirmation', { enabled: false, timing: null })).toEqual({});
  });

});
