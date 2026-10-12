import { describe, expect, expectTypeOf, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import { SETTING_DEFAULTS, SETTING_FIELD_OF, SETTING_KEYS, SETTINGS_REGISTRY, type AcademySettings, type SettingsUpdate } from './registry.js';
import { SETTINGS_SECTIONS } from './types.js';

/** The 17 keys before the registry: their camelCase PATCH names must not change. */
const LEGACY_FIELDS = [
  'lateCancelHours', 'bookingHorizonWeeks', 'renewalAlertRemaining', 'flagFutureLessonsWhenUnpaid',
  'reportTeacherEditHours', 'reportingCurrency', 'payoutCountLate', 'payoutCountNoShow', 'payoutCountTrials',
  'followUpHours', 'reminderMinutesBefore', 'reminder24hEnabled', 'messagingEnabled', 'autoMessagesEnabled',
  'crmCutoverDone', 'salesAutoAssign', 'feedbackMode',
];

const at = (dict: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), dict);

describe('settings registry', () => {
  it('keeps every legacy camelCase field and adds the new keys', () => {
    const fields = Object.values(SETTING_FIELD_OF);
    expect(fields).toEqual(expect.arrayContaining(LEGACY_FIELDS));
    expect(SETTING_FIELD_OF.reminder_24h_enabled).toBe('reminder24hEnabled');
    expect(SETTING_KEYS).toEqual(expect.arrayContaining([
      'join_opens_before_min', 'join_closes_after_min', 'makeup_window_days', 'upload_max_mb',
      'quick_reply_window_hours', 'reminder_lookahead_hours', 'follow_up_slots_from_hours',
      'follow_up_slots_to_days', 'feedback_rate_window_min', 'fx_fresh_hours', 'academy_whatsapp_e164',
      'academy_timezone', 'default_meeting_title',
    ]));
  });

  it('defaults are today\'s values (migrations seed the same)', () => {
    expect(SETTING_DEFAULTS).toMatchObject({
      late_cancel_hours: null, booking_horizon_weeks: 5, follow_up_hours: [24, 72], feedback_mode: 'buttons',
      join_opens_before_min: 15, join_closes_after_min: 120, makeup_window_days: 60, upload_max_mb: 10,
      quick_reply_window_hours: 48, reminder_lookahead_hours: 25, follow_up_slots_from_hours: 12,
      follow_up_slots_to_days: 7, feedback_rate_window_min: 10, fx_fresh_hours: 24,
      academy_whatsapp_e164: '+966566101447', academy_timezone: 'Asia/Riyadh', default_meeting_title: 'اجتماع',
      teachers_always_available: true,
    });
  });

  it('a default list is a copy, never the registry\'s own array', () => {
    expect(SETTING_DEFAULTS.follow_up_hours).not.toBe(SETTINGS_REGISTRY.follow_up_hours.default);
  });

  it('every default is inside its own min/max', () => {
    for (const key of SETTING_KEYS) {
      const def = SETTINGS_REGISTRY[key];
      if (def.type !== 'int' || def.default === null) continue;
      expect([key, def.default >= def.min && def.default <= def.max]).toEqual([key, true]);
    }
  });

  it('every label and hint exists in ar.json and en.json, and every section has a title', () => {
    const paths = SETTING_KEYS.flatMap((k) => {
      const d: { labelKey: string; hintKey?: string; toggleLabelKey?: string; toggleHintKey?: string } = SETTINGS_REGISTRY[k];
      return [d.labelKey, d.hintKey, d.toggleLabelKey, d.toggleHintKey].filter((p): p is string => !!p);
    });
    paths.push(...SETTINGS_SECTIONS.map((s) => `settings.sections.${s}`));
    const missing = paths.filter((p) => typeof at(ar, p) !== 'string' || typeof at(en, p) !== 'string');
    expect(missing).toEqual([]);
  });

  it('types follow the registry', () => {
    expectTypeOf<AcademySettings['late_cancel_hours']>().toEqualTypeOf<number | null>();
    expectTypeOf<AcademySettings['follow_up_hours']>().toEqualTypeOf<number[]>();
    expectTypeOf<AcademySettings['feedback_mode']>().toEqualTypeOf<'buttons' | 'link'>();
    expectTypeOf<AcademySettings['academy_whatsapp_e164']>().toEqualTypeOf<string>();
    expectTypeOf<SettingsUpdate['joinOpensBeforeMin']>().toEqualTypeOf<number | undefined>();
  });
});
