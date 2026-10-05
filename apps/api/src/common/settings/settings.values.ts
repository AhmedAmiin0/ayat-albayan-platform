import type { Json } from '@ab/db';
import type { AcademySettings, SettingsUpdate } from '@ab/shared';

/** Used when a row is missing or malformed; migrations 073, 123, 142, 162, 195 and 20261005000200 seed the same values. */
export const SETTING_DEFAULTS: AcademySettings = {
  late_cancel_hours: null,
  booking_horizon_weeks: 5,
  renewal_alert_remaining: 2,
  flag_future_lessons_when_unpaid: true,
  report_teacher_edit_hours: 24,
  reporting_currency: 'SAR',
  payout_count_late: false,
  payout_count_no_show: false,
  payout_count_trials: false,
  follow_up_hours: [24, 72],
  reminder_minutes_before: 60,
  reminder_24h_enabled: false,
  messaging_enabled: false,
  auto_messages_enabled: false,
  crm_cutover_done: false,
  sales_auto_assign: true,
  feedback_mode: 'buttons',
};

export type SettingKey = keyof AcademySettings;

const int = (min: number) => (v: Json | undefined): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min;
const bool = (v: Json | undefined): v is boolean => typeof v === 'boolean';
/** Non-empty, ascending whole hours (R-LEAD-05). */
const hours = (v: Json | undefined): boolean =>
  Array.isArray(v) && v.length > 0 && v.every((h, i) => int(1)(h) && (i === 0 || h > Number(v[i - 1])));

/** Per key: is the stored JSON a valid value? Anything else reads as the default. */
const VALID: { [K in SettingKey]: (v: Json | undefined) => boolean } = {
  late_cancel_hours: (v) => typeof v === 'number' && v >= 0,
  booking_horizon_weeks: int(1),
  renewal_alert_remaining: int(0),
  flag_future_lessons_when_unpaid: bool,
  report_teacher_edit_hours: int(0),
  reporting_currency: (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v),
  payout_count_late: bool,
  payout_count_no_show: bool,
  payout_count_trials: bool,
  follow_up_hours: hours,
  reminder_minutes_before: int(1),
  reminder_24h_enabled: bool,
  messaging_enabled: bool,
  auto_messages_enabled: bool,
  crm_cutover_done: bool,
  sales_auto_assign: bool,
  feedback_mode: (v) => v === 'buttons' || v === 'link',
};

/** Stored rows → typed settings, defaults filled in key by key. */
export function readSettings(rows: readonly { key: string; value: Json }[]): AcademySettings {
  const stored = new Map(rows.map((r) => [r.key, r.value]));
  const pick = <K extends SettingKey>(key: K): AcademySettings[K] => {
    const v = stored.get(key);
    return VALID[key](v) ? (v as AcademySettings[K]) : SETTING_DEFAULTS[key];
  };
  return {
    late_cancel_hours: pick('late_cancel_hours'),
    booking_horizon_weeks: pick('booking_horizon_weeks'),
    renewal_alert_remaining: pick('renewal_alert_remaining'),
    flag_future_lessons_when_unpaid: pick('flag_future_lessons_when_unpaid'),
    report_teacher_edit_hours: pick('report_teacher_edit_hours'),
    reporting_currency: pick('reporting_currency'),
    payout_count_late: pick('payout_count_late'),
    payout_count_no_show: pick('payout_count_no_show'),
    payout_count_trials: pick('payout_count_trials'),
    follow_up_hours: pick('follow_up_hours'),
    reminder_minutes_before: pick('reminder_minutes_before'),
    reminder_24h_enabled: pick('reminder_24h_enabled'),
    messaging_enabled: pick('messaging_enabled'),
    auto_messages_enabled: pick('auto_messages_enabled'),
    crm_cutover_done: pick('crm_cutover_done'),
    sales_auto_assign: pick('sales_auto_assign'),
    feedback_mode: pick('feedback_mode'),
  };
}

const KEY_OF: { [K in keyof Required<SettingsUpdate>]: SettingKey } = {
  lateCancelHours: 'late_cancel_hours',
  bookingHorizonWeeks: 'booking_horizon_weeks',
  renewalAlertRemaining: 'renewal_alert_remaining',
  flagFutureLessonsWhenUnpaid: 'flag_future_lessons_when_unpaid',
  reportTeacherEditHours: 'report_teacher_edit_hours',
  reportingCurrency: 'reporting_currency',
  payoutCountLate: 'payout_count_late',
  payoutCountNoShow: 'payout_count_no_show',
  payoutCountTrials: 'payout_count_trials',
  followUpHours: 'follow_up_hours',
  reminderMinutesBefore: 'reminder_minutes_before',
  reminder24hEnabled: 'reminder_24h_enabled',
  messagingEnabled: 'messaging_enabled',
  autoMessagesEnabled: 'auto_messages_enabled',
  crmCutoverDone: 'crm_cutover_done',
  salesAutoAssign: 'sales_auto_assign',
  feedbackMode: 'feedback_mode',
};

/** PATCH body (camelCase, only sent keys) → settings rows to write. */
export function settingsChanges(update: SettingsUpdate): Partial<AcademySettings> {
  const out: Partial<Record<SettingKey, AcademySettings[SettingKey]>> = {};
  for (const [field, key] of Object.entries(KEY_OF) as [keyof SettingsUpdate, SettingKey][]) {
    const value = update[field];
    if (value !== undefined) out[key] = value;
  }
  return out as Partial<AcademySettings>;
}
