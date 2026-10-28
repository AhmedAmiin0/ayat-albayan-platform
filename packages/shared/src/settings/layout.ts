import type { SettingKey } from './registry.js';

// Where each setting shows on /admin/settings, kept apart from who owns it (domains/*.ts). The
// page renders a section's registry fields in this order; the sections come in SETTINGS_SECTIONS order.

/** The /admin/settings sections, in page order. `appearance` holds no setting rows (theme is per browser). */
export const SETTINGS_SECTIONS = [
  'messaging',
  'schedule',
  'classroom',
  'reports',
  'accounts',
  'uploads',
  'academy',
  'sales',
  'appearance',
] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

/** Every setting key, once, in its section and in page order. */
export const SETTINGS_LAYOUT = {
  messaging: [
    'messaging_enabled',
    'auto_messages_enabled',
    'crm_cutover_done',
    'comms_source',
    'feedback_mode',
    'reminder_minutes_before',
    'reminder_24h_enabled',
    'teacher_whatsapp_new_student',
    'teacher_whatsapp_lesson_reminder',
    'follow_up_hours',
    'reminder_lookahead_hours',
    'follow_up_slots_from_hours',
    'follow_up_slots_to_days',
    'quick_reply_window_hours',
    'chat_reopen_template',
    'crm_media_host',
    'crm_media_copy_all',
    'whatsapp_calls_enabled',
    'calls_permission_template',
  ],
  schedule: ['booking_horizon_weeks', 'late_cancel_hours', 'makeup_window_days', 'teachers_always_available'],
  classroom: ['join_opens_before_min', 'join_closes_after_min', 'default_meeting_title', 'meeting_link_auto'],
  reports: ['report_teacher_edit_hours'],
  accounts: [
    'reporting_currency',
    'renewal_alert_remaining',
    'subscription_expiry_days',
    'flag_future_lessons_when_unpaid',
    'payout_count_late',
    'payout_count_no_show',
    'payout_count_trials',
    'fx_fresh_hours',
  ],
  uploads: ['upload_max_mb'],
  academy: [
    'academy_whatsapp_e164',
    'academy_timezone',
    'feedback_rate_window_min',
    'academy_contact',
    'recording_consent_notice',
    'family_login_enabled',
    'login_code_ttl_minutes',
    'login_code_max_attempts',
    'recording_retention_days',
    'activity_retention_days',
  ],
  sales: ['sales_auto_assign', 'renewal_commission_percent'],
  appearance: [],
} as const satisfies Record<SettingsSectionId, readonly SettingKey[]>;

/** Every key is placed exactly once: layout.test.ts pins it (in types and at run time). */
const SECTION_OF = Object.fromEntries(
  SETTINGS_SECTIONS.flatMap((id) => SETTINGS_LAYOUT[id].map((key) => [key, id])),
) as Record<SettingKey, SettingsSectionId>;

/** The /admin/settings section a setting shows in. */
export const settingSection = (key: SettingKey): SettingsSectionId => SECTION_OF[key];
