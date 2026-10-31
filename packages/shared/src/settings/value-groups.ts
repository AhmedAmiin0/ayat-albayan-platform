import type { SettingKey } from './registry.js';

// «القيم» (docs/26b §2): the store's rows in small groups, one group per view (owner, 2026-10-23
// «i dont like long pages», «stick with table»). Kept apart from layout.ts, which still orders the
// old single page; docs/26 26-P1 later moves `group`/`confirm`/`ownedBy` into the registry itself.

/** The editable groups of «القيم», in list order (39 keys). */
export const VALUE_GROUPS = {
  schedule: ['booking_horizon_weeks', 'late_cancel_hours', 'makeup_window_days', 'teachers_always_available'],
  classroom: ['join_opens_before_min', 'join_closes_after_min', 'default_meeting_title', 'meeting_max_minutes',
    'meeting_link_auto'],
  reports: ['report_teacher_edit_hours', 'report_form_v2'],
  accounts: [
    'reporting_currency',
    'renewal_alert_remaining',
    'subscription_expiry_days',
    'flag_future_lessons_when_unpaid',
    'fx_fresh_hours',
  ],
  payouts: ['payout_count_late', 'payout_count_no_show', 'payout_count_trials'],
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
  ],
  messages: ['quick_reply_window_hours', 'reminder_lookahead_hours', 'chat_reopen_template', 'whatsapp_calls_enabled', 'calls_permission_template', 'crm_media_host', 'crm_media_copy_all', 'presence_enabled'],
  sales: ['sales_auto_assign', 'renewal_commission_percent'],
  retention: ['recording_retention_days', 'activity_retention_days'],
} as const satisfies Record<string, readonly SettingKey[]>;
export type ValueGroupId = keyof typeof VALUE_GROUPS;
export const VALUE_GROUP_IDS = Object.keys(VALUE_GROUPS) as ValueGroupId[];

/**
 * Keys a module page owns («تُدار من صفحة أخرى»): read-only in «القيم», with a link to the page
 * that edits them. The three Google values are not settings rows (they live in google_settings).
 */
export const OWNED_VALUE_GROUPS = {
  notifications: [
    'reminder_minutes_before',
    'reminder_24h_enabled',
    'teacher_whatsapp_new_student',
    'teacher_whatsapp_lesson_reminder',
    'follow_up_hours',
    'feedback_mode',
    'follow_up_slots_from_hours',
    'follow_up_slots_to_days',
  ],
  sending: ['messaging_enabled', 'auto_messages_enabled', 'crm_cutover_done', 'comms_source'],
} as const satisfies Record<string, readonly SettingKey[]>;
export type OwnedValueGroupId = keyof typeof OWNED_VALUE_GROUPS | 'google';

/** Every key «القيم» may write (the owned keys are never in it). */
export const EDITABLE_VALUE_KEYS: readonly SettingKey[] = Object.values(VALUE_GROUPS).flat();

/** May «القيم» edit this key? (false for module-owned keys and unknown names). */
export const isEditableValueKey = (key: string): key is SettingKey =>
  (EDITABLE_VALUE_KEYS as readonly string[]).includes(key);

/**
 * Owner defaults (2026-10-23): a typed confirmation (type the number of days) for values that
 * delete data; a plain dialog for booking-wide switches.
 */
export const VALUE_CONFIRM: Partial<Record<SettingKey, 'typed' | 'plain'>> = {
  recording_retention_days: 'typed',
  activity_retention_days: 'typed',
  teachers_always_available: 'plain',
  meeting_link_auto: 'plain',
  sales_auto_assign: 'plain',
  whatsapp_calls_enabled: 'plain',
  crm_media_copy_all: 'plain',
  family_login_enabled: 'plain',
  report_form_v2: 'plain',
};
