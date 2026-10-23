import { counted, pluralForm, type SettingKey } from '@ab/shared';
import { t } from '@/lib/i18n';

// The unit of each counted setting (rule 6: counts of hours, days…, never times of day). The
// registry has no units yet (docs/26 26-P1 adds them); until then they are listed here.

export type ValueUnit = keyof typeof t.settingsValues.units;

export const VALUE_UNITS: Partial<Record<SettingKey, ValueUnit>> = {
  booking_horizon_weeks: 'weeks',
  late_cancel_hours: 'hours',
  makeup_window_days: 'days',
  join_opens_before_min: 'minutes',
  join_closes_after_min: 'minutes',
  report_teacher_edit_hours: 'hours',
  renewal_alert_remaining: 'lessons',
  subscription_expiry_days: 'days',
  fx_fresh_hours: 'hours',
  upload_max_mb: 'mb',
  feedback_rate_window_min: 'minutes',
  quick_reply_window_hours: 'hours',
  recording_retention_days: 'days',
  activity_retention_days: 'days',
  reminder_minutes_before: 'minutes',
  follow_up_hours: 'hours',
  reminder_lookahead_hours: 'hours',
  follow_up_slots_from_hours: 'hours',
  follow_up_slots_to_days: 'days',
};

/**
 * The unit word beside a number (the box, a list), counted for that number when there is one:
 * «5 أسابيع», «12 أسبوعًا»; the bare word («أسبوع») for 1, 2 or no number yet.
 */
export function unitWord(key: SettingKey, n?: number): string | undefined {
  const unit = VALUE_UNITS[key];
  if (!unit) return undefined;
  const forms = t.settingsValues.units[unit];
  const form = n === undefined || !Number.isFinite(n) ? 'one' : pluralForm(n);
  if (form === 'one' || form === 'two') return forms.unit;
  return forms[form].split('{n}').join('').trim();
}

/** A count with its unit, in the right Arabic form («ساعتان», «5 أسابيع»); a bare number without one. */
export function countText(key: SettingKey, n: number): string {
  const unit = VALUE_UNITS[key];
  return unit ? counted(t.settingsValues.units[unit], n) : String(n);
}
