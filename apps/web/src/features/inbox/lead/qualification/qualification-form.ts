import {
  FILLED_BY,
  GENDERS,
  GROUP_KINDS,
  leadQualificationPatchSchema,
  type Gender,
  type LeadQualificationPatch,
} from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

// R-LEAD-03: the lead's structured qualification, captured in the thread, with the questions the
// first registration form asked (research-forms 8–9). All optional; a field emptied by the admin
// is sent as null (clears it); untouched fields are not sent (L1 merges).

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
export type QualTextField = (typeof TEXT_FIELDS)[number];

export type QualForm = Record<QualTextField, string> & {
  age: string;
  gender: Gender | '';
  filled_by: (typeof FILLED_BY)[number] | '';
  group_kind: (typeof GROUP_KINDS)[number] | '';
  tz: string;
  available_days: number[];
  preferred_from: string;
  preferred_to: string;
};

export type QualErrors = Partial<Record<keyof QualForm, string>>;
export type QualResult = { ok: true; patch: LeadQualificationPatch } | { ok: false; errors: QualErrors };

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const pick = <T extends string>(list: readonly T[], v: unknown): T | '' => list.find((x) => x === v) ?? '';

/** leads.qualification (jsonb, anything) → the form's strings. */
export function qualForm(q: unknown): QualForm {
  const r = q && typeof q === 'object' ? (q as Record<string, unknown>) : {};
  const days = Array.isArray(r['available_days']) ? r['available_days'].filter((d): d is number => Number.isInteger(d)) : [];
  const text = Object.fromEntries(TEXT_FIELDS.map((k) => [k, str(r[k])])) as Record<QualTextField, string>;
  return {
    ...text,
    age: str(r['age']),
    gender: pick(GENDERS, r['gender']),
    filled_by: pick(FILLED_BY, r['filled_by']),
    group_kind: pick(GROUP_KINDS, r['group_kind']),
    tz: str(r['tz']),
    available_days: [...days].sort((a, b) => a - b),
    preferred_from: str(r['preferred_from']),
    preferred_to: str(r['preferred_to']),
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
const PHONE: Record<string, string | undefined> = t.common.phoneErrors;

/** Only what changed, validated with the API's own schema (leadQualificationPatchSchema). */
export function qualPatch(form: QualForm, before: QualForm): QualResult {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(form) as (keyof QualForm)[]) {
    if (JSON.stringify(wire(key, form)) !== JSON.stringify(wire(key, before))) patch[key] = wire(key, form);
  }
  if (form.preferred_from && form.preferred_to && form.preferred_from >= form.preferred_to) {
    return { ok: false, errors: { preferred_to: t.common.endBeforeStart } };
  }
  const parsed = leadQualificationPatchSchema.safeParse(patch);
  if (parsed.success) return { ok: true, patch: parsed.data };
  const errors: QualErrors = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0] as keyof QualForm;
    errors[key] = (key === 'alt_phone' ? PHONE[issue.message] : MESSAGES[key]) ?? t.common.error;
  }
  return { ok: false, errors };
}
