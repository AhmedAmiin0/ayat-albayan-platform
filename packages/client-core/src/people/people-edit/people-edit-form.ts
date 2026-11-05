import {
  newFamilySchema,
  peopleGuardianPatchSchema,
  peopleStudentPatchSchema,
  type PeopleEditView,
  type PeopleGuardianPatch,
  type PeopleStudentPatch,
} from '@ab/shared';
import type { z } from 'zod';

// «تعديل البيانات» on web and mobile: every field a string while typing; on save only the changed
// fields go, parsed by the API's own schemas (blank → null, the age a number, the phone E.164).

export type StudentForm = Record<
  | 'name'
  | 'age'
  | 'gender'
  | 'level'
  | 'memorized'
  | 'goal'
  | 'riwaya'
  | 'tz'
  | 'notes'
  | 'teacher_gender_pref',
  string
>;
export type FamilyForm = Record<'name' | 'phone_e164' | 'country' | 'tz' | 'notes', string>;

/** The parsed patch, or the fields that failed (their keys, for the field errors). */
export type PatchResult<P> = { patch: P; invalid: [] } | { patch: null; invalid: string[] };

const text = (v: string | number | null | undefined): string => String(v ?? '');

/** The sales role's view has no notes (owner 2026-10-27): the forms leave the fields out. */
export const hasNotes = (view: PeopleEditView): boolean => view.student.notes !== undefined;

const STUDENT_TEXTS = ['name', 'level', 'memorized', 'goal', 'riwaya', 'notes'] as const;
export type StudentTextKey = (typeof STUDENT_TEXTS)[number];
const notNotes = (key: StudentTextKey): boolean => key !== 'notes';

/** The student's free-text fields this view may edit, notes only when the view has them. */
export const studentTextKeys = (view: PeopleEditView): readonly StudentTextKey[] =>
  hasNotes(view) ? STUDENT_TEXTS : STUDENT_TEXTS.filter(notNotes);

export function studentFormOf(s: PeopleEditView['student']): StudentForm {
  return {
    name: s.name,
    age: text(s.age),
    gender: text(s.gender),
    level: text(s.level),
    memorized: text(s.memorized),
    goal: text(s.goal),
    riwaya: text(s.riwaya),
    tz: s.tz,
    notes: text(s.notes),
    teacher_gender_pref: text(s.teacher_gender_pref),
  };
}

export function familyFormOf(g: PeopleEditView['guardian']): FamilyForm {
  return {
    name: g.name,
    phone_e164: g.phone_e164,
    country: text(g.country),
    tz: g.tz,
    notes: text(g.notes),
  };
}

const blank = (v: string): string | null => (v.trim() === '' ? null : v);
/** Per-field conversions; any other field is its text, blank = null. */
const CONVERT: Record<string, ((v: string) => unknown) | undefined> = {
  age: (v) => (v.trim() === '' ? null : Number(v)),
};

function patchOf<S extends z.ZodType, F extends Record<string, string>>(
  schema: S,
  forms: { initial: F; current: F },
): PatchResult<z.output<S>> {
  const keys = Object.keys(forms.current).filter((k) => forms.current[k] !== forms.initial[k]);
  const raw = Object.fromEntries(
    keys.map((k) => [k, (CONVERT[k] ?? blank)(forms.current[k] ?? '')]),
  );
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { patch: parsed.data, invalid: [] }
    : { patch: null, invalid: parsed.error.issues.map((i) => String(i.path[0] ?? '')) };
}

export const studentPatchOf = (
  initial: StudentForm,
  current: StudentForm,
): PatchResult<PeopleStudentPatch> => patchOf(peopleStudentPatchSchema, { initial, current });

export const familyPatchOf = (
  initial: FamilyForm,
  current: FamilyForm,
): PatchResult<PeopleGuardianPatch> => patchOf(peopleGuardianPatchSchema, { initial, current });

/** «ولي أمر جديد» of «ربط بولي أمر آخر»: name, phone and zone, as the API parses them. */
export type NewFamilyForm = Record<'name' | 'phone_e164' | 'tz', string>;

export function newFamilyOf(form: NewFamilyForm): PatchResult<z.output<typeof newFamilySchema>> {
  const parsed = newFamilySchema.safeParse({ ...form, name: form.name.trim() });
  return parsed.success
    ? { patch: parsed.data, invalid: [] }
    : { patch: null, invalid: parsed.error.issues.map((i) => String(i.path[0] ?? '')) };
}
