import { SETTINGS_SECTIONS, settingDef, settingSection, type SettingKey } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { PAGE_SECTIONS } from './page-sections';
import { FORM_KEYS } from './registry-form/settings-form';

/** /admin/settings before the segregation: each section's rows in page order (the legacy SETTING_KEYS order). */
const LEGACY_ROWS: Readonly<Record<string, readonly SettingKey[]>> = {
  messaging: [
    'messaging_enabled', 'auto_messages_enabled', 'crm_cutover_done', 'feedback_mode', 'reminder_minutes_before',
    'reminder_24h_enabled', 'teacher_whatsapp_new_student', 'teacher_whatsapp_lesson_reminder', 'follow_up_hours',
    'reminder_lookahead_hours', 'follow_up_slots_from_hours', 'follow_up_slots_to_days', 'quick_reply_window_hours',
  ],
  schedule: ['booking_horizon_weeks', 'late_cancel_hours', 'makeup_window_days', 'teachers_always_available'],
  classroom: ['join_opens_before_min', 'join_closes_after_min', 'default_meeting_title', 'meeting_link_auto'],
  reports: ['report_teacher_edit_hours'],
  accounts: [
    'reporting_currency', 'renewal_alert_remaining', 'subscription_expiry_days', 'flag_future_lessons_when_unpaid',
    'payout_count_late', 'payout_count_no_show', 'payout_count_trials', 'fx_fresh_hours',
  ],
  uploads: ['upload_max_mb'],
  academy: [
    'academy_whatsapp_e164', 'academy_timezone', 'feedback_rate_window_min', 'academy_contact',
    'recording_consent_notice', 'recording_retention_days', 'activity_retention_days',
  ],
  sales: ['sales_auto_assign'],
  appearance: [],
};

/** The legacy SettingsSections: SectionFields(id) drew FORM_KEYS of that section, in order. */
const isRegistrySection = (id: string): id is (typeof SETTINGS_SECTIONS)[number] => (SETTINGS_SECTIONS as readonly string[]).includes(id);
const rendered = (id: string): SettingKey[] => (isRegistrySection(id) ? FORM_KEYS.filter((k) => settingSection(k) === id) : []);

describe('PAGE_SECTIONS (the order of /admin/settings)', () => {
  it('ids in the legacy order: the nine registry sections, then integrations, then custom', () => {
    expect(PAGE_SECTIONS.map((s) => s.id)).toEqual([
      'messaging', 'schedule', 'classroom', 'reports', 'accounts', 'uploads', 'academy', 'sales', 'appearance', 'integrations', 'custom',
    ]);
    expect(PAGE_SECTIONS.slice(0, 9).map((s) => s.id)).toEqual([...SETTINGS_SECTIONS]);
  });

  it('labels as the legacy index had them (registry section titles, EXTRA_NAV for the last two)', () => {
    expect(PAGE_SECTIONS.map((s) => s.label)).toEqual([
      ...SETTINGS_SECTIONS.map((s) => t.settings.sections[s]),
      t.integrations.title,
      t.config.sections.custom,
    ]);
  });

  it('the form fields render in the legacy per-section order', () => {
    const legacyForm = Object.values(LEGACY_ROWS).flat().filter((k) => settingDef(k).form !== false);
    expect(PAGE_SECTIONS.flatMap((s) => rendered(s.id))).toEqual(legacyForm);
    expect(FORM_KEYS).toEqual(legacyForm);
    for (const s of PAGE_SECTIONS) expect(rendered(s.id)).toEqual((LEGACY_ROWS[s.id] ?? []).filter((k) => settingDef(k).form !== false));
  });

  it('the switches that save on their own are not form fields', () => {
    expect(FORM_KEYS).not.toContain('messaging_enabled');
    expect(FORM_KEYS).not.toContain('sales_auto_assign');
    expect(Object.values(LEGACY_ROWS).flat()).toHaveLength(39);
  });

  it('each section is found by its own words and an empty search finds every section', () => {
    const at = (id: string) => PAGE_SECTIONS.find((s) => s.id === id);
    expect(at('schedule')?.matches(t.settings.bookingHorizonWeeks, [])).toBe(true);
    expect(at('schedule')?.matches(t.settings.uploadMaxMb, [])).toBe(false);
    expect(at('messaging')?.matches('messaging_enabled', [])).toBe(true);
    expect(at('sales')?.matches('sales_auto_assign', [])).toBe(true);
    expect(at('appearance')?.matches(t.settings.theme, [])).toBe(true);
    expect(at('integrations')?.matches('WA_WABA_ID', [])).toBe(true);
    const entry = { key: 'promo', value: 1, description: null, isPublic: false, updatedAt: '2026-10-05T10:00:00Z', updatedBy: null };
    expect(at('custom')?.matches('promo', [entry])).toBe(true);
    expect(at('custom')?.matches('promo', [])).toBe(false);
    expect(PAGE_SECTIONS.filter((s) => s.id !== 'custom').every((s) => s.matches('', []))).toBe(true);
  });
});
