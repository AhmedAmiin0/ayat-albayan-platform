import { describe, expect, expectTypeOf, it } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import { SETTINGS_LAYOUT, SETTINGS_SECTIONS, settingSection, type SettingsSectionId } from './layout.js';
import { SETTING_KEYS, type SettingKey } from './registry.js';

/** /admin/settings field order before the registry was split by domain (2026-10-23): it must not move.
 * comms_source (docs/23 phase 3) joined after crm_cutover_done; it has its own control, not a field. */
const LEGACY_PAGE_ORDER = [
  'messaging_enabled', 'auto_messages_enabled', 'crm_cutover_done', 'comms_source', 'feedback_mode', 'reminder_minutes_before',
  'reminder_24h_enabled', 'teacher_whatsapp_new_student', 'teacher_whatsapp_lesson_reminder', 'follow_up_hours',
  'reminder_lookahead_hours', 'follow_up_slots_from_hours', 'follow_up_slots_to_days', 'quick_reply_window_hours',
  'chat_reopen_template',
  'crm_media_host',
  'crm_media_copy_all',
  'whatsapp_calls_enabled',
  'calls_permission_template',
  'booking_horizon_weeks', 'late_cancel_hours', 'makeup_window_days', 'teachers_always_available',
  'join_opens_before_min', 'join_closes_after_min', 'default_meeting_title', 'meeting_max_minutes',
  'meeting_link_auto', 'meetings_in_app',
  'report_teacher_edit_hours', 'report_form_v2',
  'reporting_currency', 'renewal_alert_remaining', 'subscription_expiry_days', 'flag_future_lessons_when_unpaid',
  'payout_count_late', 'payout_count_no_show', 'payout_count_trials', 'fx_fresh_hours',
  'upload_max_mb',
  'academy_whatsapp_e164', 'academy_timezone', 'feedback_rate_window_min', 'academy_contact',
  'recording_consent_notice', 'family_login_enabled', 'login_code_ttl_minutes', 'login_code_max_attempts',
  'presence_enabled',
  'recording_retention_days', 'activity_retention_days',
  'sales_auto_assign',
  'renewal_commission_enabled', 'renewal_commission_percent',
];

const flat = (): SettingKey[] => SETTINGS_SECTIONS.flatMap((id): readonly SettingKey[] => SETTINGS_LAYOUT[id]);

const at = (dict: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), dict);

describe('settings page layout', () => {
  it('places every registry key exactly once', () => {
    const keys = flat();
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...SETTING_KEYS].sort());
    type Placed = (typeof SETTINGS_LAYOUT)[SettingsSectionId][number];
    expectTypeOf<Exclude<SettingKey, Placed>>().toBeNever();
  });

  it('keeps the legacy page order, section by section', () => {
    expect(flat()).toEqual(LEGACY_PAGE_ORDER);
    expect(Object.keys(SETTINGS_LAYOUT)).toEqual([...SETTINGS_SECTIONS]);
  });

  it('appearance holds no setting (the theme is per browser)', () => {
    expect(SETTINGS_LAYOUT.appearance).toEqual([]);
  });

  it('settingSection names the section that lists the key', () => {
    for (const id of SETTINGS_SECTIONS) for (const key of SETTINGS_LAYOUT[id]) expect(settingSection(key)).toBe(id);
    expect(settingSection('quick_reply_window_hours')).toBe('messaging');
    expect(settingSection('feedback_rate_window_min')).toBe('academy');
    expect(settingSection('recording_retention_days')).toBe('academy');
  });

  it('every section has a title in ar.json and en.json', () => {
    const missing = SETTINGS_SECTIONS.map((id) => `settings.sections.${id}`).filter(
      (p) => typeof at(ar, p) !== 'string' || typeof at(en, p) !== 'string',
    );
    expect(missing).toEqual([]);
  });
});
