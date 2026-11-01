import { GENDERS, type Gender } from '@ab/catalog';
import { leadQualificationPatchSchema, type LeadQualificationPatch } from '../messaging/schemas.js';
import { FILLED_BY, GROUP_KINDS, type FilledBy, type GroupKind } from '../people/schemas/leads.js';

// R-LEAD-03: the lead's structured qualification form of both apps (docs/27 E5), with the questions the first
// registration form asked (research-forms 8–9). All optional; a field emptied by the admin is sent as null
// (clears it); untouched fields are not sent (L1 merges). Each app injects its own words (QualText).

export const QUAL_TEXT_FIELDS = [
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
export type QualTextField = (typeof QUAL_TEXT_FIELDS)[number];

export type QualForm = Record<QualTextField, string> & {
  age: string;
  gender: Gender | '';
  filled_by: FilledBy | '';
  group_kind: GroupKind | '';
  tz: string;
  available_days: number[];
  preferred_from: string;
  preferred_to: string;
};

export type QualErrors = Partial<Record<keyof QualForm, string>>;
export type QualResult = { ok: true; patch: LeadQualificationPatch } | { ok: false; errors: QualErrors };

/** The app's error words: `t.students.ageInvalid` and the `t.common` time / phone / generic messages. */
export interface QualText {
  ageInvalid: string;
  invalidTimeZone: string;
  invalidTime: string;
  endBeforeStart: string;
  error: string;
  phoneErrors: Record<string, string | undefined>;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const pick = <T extends string>(list: readonly T[], v: unknown): T | '' => list.find((x) => x === v) ?? '';

/** leads.qualification (jsonb, anything) → the form's strings. */
export function leadQualForm(q: unknown): QualForm {
  const r = q && typeof q === 'object' ? (q as Record<string, unknown>) : {};
  const days = Array.isArray(r['available_days']) ? r['available_days'].filter((d): d is number => Number.isInteger(d)) : [];
  const text = Object.fromEntries(QUAL_TEXT_FIELDS.map((k) => [k, str(r[k])])) as Record<QualTextField, string>;
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

/** A schema issue per field → its words (alt_phone: the phone reason's words). */
function errorsOf(issues: readonly { path: PropertyKey[]; message: string }[], text: QualText): QualErrors {
  const messages: QualErrors = { age: text.ageInvalid, tz: text.invalidTimeZone, preferred_from: text.invalidTime, preferred_to: text.invalidTime };
  const errors: QualErrors = {};
  for (const issue of issues) {
    const key = issue.path[0] as keyof QualForm;
    errors[key] = (key === 'alt_phone' ? text.phoneErrors[issue.message] : messages[key]) ?? text.error;
  }
  return errors;
}

/** Only what changed, validated with the API's own schema (leadQualificationPatchSchema, the v1 keys included). */
export function leadQualPatch(form: QualForm, before: QualForm, text: QualText): QualResult {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(form) as (keyof QualForm)[]) {
    if (JSON.stringify(wire(key, form)) !== JSON.stringify(wire(key, before))) patch[key] = wire(key, form);
  }
  if (form.preferred_from && form.preferred_to && form.preferred_from >= form.preferred_to) {
    return { ok: false, errors: { preferred_to: text.endBeforeStart } };
  }
  const parsed = leadQualificationPatchSchema.safeParse(patch);
  return parsed.success ? { ok: true, patch: parsed.data } : { ok: false, errors: errorsOf(parsed.error.issues, text) };
}
