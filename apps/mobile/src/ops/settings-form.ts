import { settingsUpdateSchema, type AcademySettings, type SettingsUpdate } from '@ab/shared';
import { t } from '@/lib/i18n';
import { ascii } from './ascii-digits';

// «إعدادات الأكاديمية» on the phone: the six settings the owner asked for (docs/10, docs/11 §2).
// The messaging switches stay on the web. Numbers are typed counts (hours, weeks, lessons).

export interface SettingsForm {
  /** late_cancel_hours null = OFF (R-SCH-07). */
  lateCancelOn: boolean;
  lateCancelHours: string;
  bookingHorizonWeeks: string;
  followUpHours: string;
  renewalAlertRemaining: string;
  reportTeacherEditHours: string;
  reportingCurrency: string;
}

export type SettingsErrors = Partial<Record<keyof SettingsForm, string>>;
export type SettingsResult =
  { ok: true; value: SettingsUpdate } | { ok: false; errors: SettingsErrors };

export function settingsForm(s: AcademySettings): SettingsForm {
  return {
    lateCancelOn: s.late_cancel_hours !== null,
    lateCancelHours: String(s.late_cancel_hours ?? 24),
    bookingHorizonWeeks: String(s.booking_horizon_weeks),
    followUpHours: s.follow_up_hours.join(t.common.listSeparator),
    renewalAlertRemaining: String(s.renewal_alert_remaining),
    reportTeacherEditHours: String(s.report_teacher_edit_hours),
    reportingCurrency: s.reporting_currency,
  };
}

/** Same fields, same text: the Save button is on only when this is false. */
export function isDirty(form: SettingsForm, saved: SettingsForm): boolean {
  return (Object.keys(form) as (keyof SettingsForm)[]).some((k) => form[k] !== saved[k]);
}

/** Western digits for typed Arabic-Indic ones; a blank box is not 0, it fails validation. */
const num = (v: string): number => {
  const w = ascii(v);
  return w === '' ? Number.NaN : Number(w);
};
/** «24، 72», «24, 72» or «24 72». */
const hours = (v: string): number[] =>
  v
    .split(/[\s,،]+/)
    .filter(Boolean)
    .map(num);

function body(form: SettingsForm): SettingsUpdate {
  return {
    lateCancelHours: form.lateCancelOn ? num(form.lateCancelHours) : null,
    bookingHorizonWeeks: num(form.bookingHorizonWeeks),
    followUpHours: hours(form.followUpHours),
    renewalAlertRemaining: num(form.renewalAlertRemaining),
    reportTeacherEditHours: num(form.reportTeacherEditHours),
    reportingCurrency: form.reportingCurrency.trim().toUpperCase(),
  };
}

const message = (m: string): string =>
  m === 'not_ascending' ? t.settings.notAscending : t.settings.invalid;

/** The form as a PATCH of the changed fields only, validated with the API's own schema. */
export function settingsUpdate(form: SettingsForm, saved: SettingsForm): SettingsResult {
  const parsed = settingsUpdateSchema.safeParse(body(form));
  if (!parsed.success) {
    const errors: SettingsErrors = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]) as keyof SettingsForm;
      errors[key] ??= message(issue.message);
    }
    return { ok: false, errors };
  }
  const before = body(saved);
  const changed = Object.entries(parsed.data).filter(
    ([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k as keyof SettingsUpdate]),
  );
  return { ok: true, value: Object.fromEntries(changed) as SettingsUpdate };
}

/** `{ issues: [{ path, message }] }` of a 400 → field errors (the API's wording of the same rule). */
export function serverErrors(body: unknown): SettingsErrors {
  const issues = (body as { issues?: { path?: unknown; message?: unknown }[] } | null)?.issues;
  const errors: SettingsErrors = {};
  for (const issue of Array.isArray(issues) ? issues : []) {
    const key = String(issue.path ?? '').split('.')[0] as keyof SettingsForm;
    errors[key] ??= message(String(issue.message));
  }
  return errors;
}
