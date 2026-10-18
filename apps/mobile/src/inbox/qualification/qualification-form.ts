import {
  FILLED_BY,
  GENDERS,
  GROUP_KINDS,
  leadQualificationPatchSchema,
  type FilledBy,
  type Gender,
  type GroupKind,
  type LeadQualificationPatch,
} from '@ab/shared';
import { t } from '@/lib/i18n';

// R-LEAD-03: the lead's structured qualification, captured on the lead screen. All optional; a
// field emptied by the admin is sent as null (clears it); untouched fields are not sent (L1 merges).
// ponytail: mirror of apps/web/src/features/inbox/qualification-form.ts (+ grid's time options);
// hoist both to @ab/shared with the web's next pass.

export const TEXT_FIELDS = [
  'student_name',
  'country',
  'city',
  'guardian_name',
  'guardian_relation',
  'alt_phone',
  'level',
  'memorized',
  'goal',
  'riwaya',
  'notes',
] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export type QualForm = Record<TextField, string> & {
  age: string;
  gender: Gender | '';
  filled_by: FilledBy | '';
  tz: string;
  available_days: number[];
  preferred_from: string;
  preferred_to: string;
  group_kind: GroupKind | '';
};

export type QualErrors = Partial<Record<keyof QualForm, string>>;
export type QualResult =
  { ok: true; patch: LeadQualificationPatch } | { ok: false; errors: QualErrors };

/** Day chips: السبت → الجمعة, the one shared week order (docs/07 §8). */
export { WEEK_ORDER } from '@ab/shared';

const LAST_MINUTE = 23 * 60 + 59;
const toTime = (minutes: number): string =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
const ALL_TIMES = [...Array.from({ length: 48 }, (_, i) => toTime(i * 30)), toTime(LAST_MINUTE)];

/** Time choices: 30-minute steps plus the day's last minute; a stored off-grid value is kept. */
export function timeOptions(current: string): string[] {
  return !current || ALL_TIMES.includes(current) ? ALL_TIMES : [...ALL_TIMES, current].sort();
}

const str = (v: unknown): string =>
  typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '';
const oneOf = <V extends string>(values: readonly V[], v: unknown): V | '' =>
  values.find((x) => x === v) ?? '';

/** leads.qualification (jsonb, anything) → the form's strings. */
export function qualForm(q: unknown): QualForm {
  const r = q && typeof q === 'object' ? (q as Record<string, unknown>) : {};
  const rawDays = r['available_days'];
  const days = Array.isArray(rawDays)
    ? rawDays.filter((d): d is number => Number.isInteger(d))
    : [];
  const text = Object.fromEntries(TEXT_FIELDS.map((k) => [k, str(r[k])])) as Record<
    TextField,
    string
  >;
  return {
    ...text,
    age: str(r['age']),
    gender: oneOf(GENDERS, r['gender']),
    filled_by: oneOf(FILLED_BY, r['filled_by']),
    tz: str(r['tz']),
    available_days: [...days].sort((a, b) => a - b),
    preferred_from: str(r['preferred_from']),
    preferred_to: str(r['preferred_to']),
    group_kind: oneOf(GROUP_KINDS, r['group_kind']),
  };
}

function wire(key: keyof QualForm, form: QualForm): unknown {
  const value = form[key];
  if (key === 'available_days') return form.available_days.length ? form.available_days : null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return key === 'age' ? Number(trimmed) : trimmed;
}

const MESSAGES: QualErrors = {
  age: t.students.ageInvalid,
  tz: t.common.invalidTimeZone,
  preferred_from: t.common.invalidTime,
  preferred_to: t.common.invalidTime,
};
const phoneErrors: Record<string, string | undefined> = t.common.phoneErrors;

/** Only what changed, validated with the API's own schema (the v1 keys included). */
export function qualPatch(form: QualForm, before: QualForm): QualResult {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(form) as (keyof QualForm)[]) {
    if (JSON.stringify(wire(key, form)) !== JSON.stringify(wire(key, before)))
      patch[key] = wire(key, form);
  }
  if (form.preferred_from && form.preferred_to && form.preferred_from >= form.preferred_to) {
    return { ok: false, errors: { preferred_to: t.common.endBeforeStart } };
  }
  const parsed = leadQualificationPatchSchema.safeParse(patch);
  return parsed.success
    ? { ok: true, patch: parsed.data }
    : { ok: false, errors: errorsOf(parsed.error.issues) };
}

/** A schema issue per field → its words; the other number says what is wrong with it. */
function errorsOf(issues: readonly { path: PropertyKey[]; message: string }[]): QualErrors {
  const errors: QualErrors = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof QualForm;
    const phone = key === 'alt_phone' ? phoneErrors[issue.message] : undefined;
    errors[key] = phone ?? MESSAGES[key] ?? t.common.error;
  }
  return errors;
}
