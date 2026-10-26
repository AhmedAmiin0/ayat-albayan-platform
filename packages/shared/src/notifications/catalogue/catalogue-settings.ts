import type { AcademySettings, SettingKey } from '../../settings/index.js';

/**
 * The only settings the notification catalogue reads: the two sending gates, the rows' own
 * switches (RowSwitchKey) and the timings shown next to a trigger (TimingKey).
 */
export const CATALOGUE_SETTING_KEYS = [
  'messaging_enabled',
  'auto_messages_enabled',
  'reminder_24h_enabled',
  'teacher_whatsapp_lesson_reminder',
  'teacher_whatsapp_new_student',
  'feedback_mode',
  'reminder_minutes_before',
  'renewal_alert_remaining',
  'follow_up_hours',
] as const satisfies readonly SettingKey[];

/** The catalogue's slice of the settings (a full AcademySettings fits). */
export type CatalogueSettings = Pick<AcademySettings, (typeof CATALOGUE_SETTING_KEYS)[number]>;
