import { studentUpdateSchema, type Gender, type Program, type StudentStatus, type StudentUpdate } from '@ab/shared';
import { t } from '@/lib/i18n';
import { parseAge } from './create-student';
import type { StudentProfile } from './types';

/** Editable profile fields (R-STU-05). Inputs hold strings; '' means "not set". */
export type ProfileValues = {
  name: string;
  age: string;
  gender: Gender | '';
  program: Program;
  status: StudentStatus;
  teacher_id: string;
  tz: string;
  level: string;
  memorized: string;
  goal: string;
  riwaya: string;
  meeting_link_override: string;
  notes: string;
};

export const PROFILE_LABELS: Record<keyof ProfileValues, string> = {
  name: t.students.name,
  age: t.students.age,
  gender: t.students.gender,
  program: t.students.program,
  status: t.students.status,
  teacher_id: t.students.teacher,
  tz: t.students.tz,
  level: t.students.level,
  memorized: t.students.memorized,
  goal: t.students.goal,
  riwaya: t.students.riwaya,
  meeting_link_override: t.students.meetingLink,
  notes: t.students.notes,
};

export function toProfileValues(p: StudentProfile): ProfileValues {
  return {
    name: p.name,
    age: typeof p.age === 'number' ? String(p.age) : '',
    gender: p.gender ?? '',
    program: p.program,
    status: p.status,
    teacher_id: p.teacher_id ?? '',
    tz: p.tz,
    level: p.level ?? '',
    memorized: p.memorized ?? '',
    goal: p.goal ?? '',
    riwaya: p.riwaya ?? '',
    meeting_link_override: p.meeting_link_override ?? '',
    notes: p.notes ?? '',
  };
}

export type PatchResult = { ok: true; patch: StudentUpdate } | { ok: false; error: string };

/**
 * Values → PATCH body, validated with the shared schema the API uses. `status` goes out only when the
 * admin changed it from `loaded` (the status the form loaded), together with `expected_status: loaded`:
 * a stale form must never undo an automatic move (payment, expiry, attendance) (R-STU-05).
 */
export function toStudentPatch(values: ProfileValues, loaded: StudentStatus): PatchResult {
  const age = parseAge(values.age);
  if (age === undefined) return { ok: false, error: t.students.ageInvalid };
  const raw: Record<string, unknown> = Object.fromEntries(
    Object.entries({ ...values, age: '' }).map(([k, v]) => [k, v.trim() === '' ? null : v.trim()]),
  );
  raw['age'] = age;
  const r = studentUpdateSchema.safeParse(raw);
  if (r.success) return { ok: true, patch: withStatus(r.data, { status: values.status, loaded }) };
  const key = String(r.error.issues[0]?.path[0] ?? '') as keyof ProfileValues;
  const field = PROFILE_LABELS[key] ?? key;
  return { ok: false, error: t.students.invalidField.replace('{field}', field) };
}

function withStatus(
  parsed: StudentUpdate,
  { status, loaded }: { status: StudentStatus; loaded: StudentStatus },
): StudentUpdate {
  const rest: StudentUpdate = { ...parsed };
  delete rest.status;
  delete rest.expected_status;
  return status === loaded ? rest : { ...rest, status, expected_status: loaded };
}
