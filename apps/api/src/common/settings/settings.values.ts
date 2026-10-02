import type { Json } from '@ab/db';
import type { AcademySettings, SettingsUpdate } from '@ab/shared';

/** Used when a row is missing or malformed; migrations 073 and 123 seed the same values. */
export const SETTING_DEFAULTS: AcademySettings = {
  late_cancel_hours: null,
  booking_horizon_weeks: 5,
  renewal_alert_remaining: 2,
  flag_future_lessons_when_unpaid: true,
  report_teacher_edit_hours: 24,
  reporting_currency: 'SAR',
  payout_count_late: false,
  payout_count_no_show: false,
};

export type SettingKey = keyof AcademySettings;

const int = (min: number) => (v: Json | undefined): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min;
const bool = (v: Json | undefined): v is boolean => typeof v === 'boolean';

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
