import { settingsUpdateSchema, type AcademySettings, type SettingsUpdate } from '@ab/shared';
import { t } from '@/lib/i18n';

// /admin/settings form ↔ PATCH /settings (docs/10, docs/11 §settings, docs/12 §2). Numbers are
// typed counts (hours, weeks, lessons), never times of day. The kill switch saves on its own.

type NumberKey =
  | 'bookingHorizonWeeks'
  | 'renewalAlertRemaining'
  | 'reportTeacherEditHours'
  | 'reminderMinutesBefore';
type FlagKey =
  | 'flagFutureLessonsWhenUnpaid'
  | 'payoutCountLate'
  | 'payoutCountNoShow'
  | 'payoutCountTrials'
  | 'reminder24hEnabled';

export type SettingsForm = Record<NumberKey, string> &
  Record<FlagKey, boolean> & {
    /** late_cancel_hours null = OFF (R-SCH-07). */
    lateCancelOn: boolean;
    lateCancelHours: string;
    reportingCurrency: string;
    /** «24، 72»: hours after their last message, ascending (R-LEAD-05). */
    followUpHours: string;
  };

export type SettingsErrors = Partial<Record<keyof SettingsForm, string>>;
export type SettingsResult = { ok: true; value: SettingsUpdate } | { ok: false; errors: SettingsErrors };

export function settingsForm(s: AcademySettings): SettingsForm {
  return {
    lateCancelOn: s.late_cancel_hours !== null,
    lateCancelHours: String(s.late_cancel_hours ?? 24),
    bookingHorizonWeeks: String(s.booking_horizon_weeks),
    renewalAlertRemaining: String(s.renewal_alert_remaining),
    flagFutureLessonsWhenUnpaid: s.flag_future_lessons_when_unpaid,
    reportTeacherEditHours: String(s.report_teacher_edit_hours),
    reportingCurrency: s.reporting_currency,
    payoutCountLate: s.payout_count_late,
    payoutCountNoShow: s.payout_count_no_show,
    payoutCountTrials: s.payout_count_trials,
    reminderMinutesBefore: String(s.reminder_minutes_before),
    reminder24hEnabled: s.reminder_24h_enabled,
    followUpHours: s.follow_up_hours.join(t.common.listJoiner),
  };
}

/** A blank box is not 0: it fails validation like any other bad number. */
const num = (v: string): number => (v.trim() === '' ? Number.NaN : Number(v.trim()));
/** «24، 72», «24, 72» or «24 72». */
const hours = (v: string): number[] => v.split(/[\s,،]+/).filter(Boolean).map(Number);

/** The whole form as one PATCH, validated with the API's own schema. */
export function settingsUpdate(form: SettingsForm): SettingsResult {
  const body = {
    lateCancelHours: form.lateCancelOn ? num(form.lateCancelHours) : null,
    bookingHorizonWeeks: num(form.bookingHorizonWeeks),
    renewalAlertRemaining: num(form.renewalAlertRemaining),
    flagFutureLessonsWhenUnpaid: form.flagFutureLessonsWhenUnpaid,
    reportTeacherEditHours: num(form.reportTeacherEditHours),
    reportingCurrency: form.reportingCurrency,
    payoutCountLate: form.payoutCountLate,
    payoutCountNoShow: form.payoutCountNoShow,
    payoutCountTrials: form.payoutCountTrials,
    reminderMinutesBefore: num(form.reminderMinutesBefore),
    reminder24hEnabled: form.reminder24hEnabled,
    followUpHours: hours(form.followUpHours),
  };
  const parsed = settingsUpdateSchema.safeParse(body);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: SettingsErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof SettingsForm;
    errors[key] ??= issue.message === 'not_ascending' ? t.settings.notAscending : t.settings.invalid;
  }
  return { ok: false, errors };
}
