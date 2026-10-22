import type { PushKind } from '../enums/index.js';
import type { TemplateKey } from '../messaging/templates.js';
import type { AcademySettings, SettingKey } from '../settings/index.js';

// The notification catalogue (docs/23 §2b): what the academy sends, to whom, through which channel,
// and which of today's settings governs it. Code defines what exists; phase 3 adds the admin's overrides.

export const NOTIFICATION_AUDIENCES = ['guardian', 'teacher', 'lead', 'staff'] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const NOTIFICATION_CHANNELS = ['whatsapp', 'bell', 'push'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Settings a catalogue row's own switch may read today (docs/23a §B6). */
export type RowSwitchKey = Extract<
  SettingKey,
  'reminder_24h_enabled' | 'teacher_whatsapp_lesson_reminder' | 'teacher_whatsapp_new_student' | 'feedback_mode'
>;

/** Settings that say when a row is sent (shown next to its trigger). */
export type TimingKey = Extract<SettingKey, 'reminder_minutes_before' | 'renewal_alert_remaining' | 'follow_up_hours'>;

export interface NotificationEntry<K extends string = string> {
  key: K;
  audience: NotificationAudience;
  channels: readonly NotificationChannel[];
  /** The message_templates keys it may send (a variant is picked in code, e.g. by link host). */
  templates: readonly TemplateKey[];
  /** The bell / push kind it writes (push_notifications.kind). */
  pushKind?: PushKind;
  /** Governed by «الرسائل التلقائية» (settings.auto_messages_enabled). */
  automatic: boolean;
  /** Sent only when a person presses a button: listed, never switched. */
  manual: boolean;
  /** Families rely on it (booking confirmation, report PDF): turning it off will need a typed confirmation. */
  essential: boolean;
  /** A safety alert that stays on (a failed send must reach an admin). */
  locked: boolean;
  /** The row's own switch today, if any, and whether the given settings turn the row on. */
  rowSwitch?: { key: RowSwitchKey; isOn: (s: AcademySettings) => boolean };
  /** The setting that says when it is sent. */
  timing?: TimingKey;
  /** Today's behaviour on a fresh install (the settings' seeded defaults). */
  defaults: { enabled: boolean };
}
