import type { Gender, LeadSource, Program } from '@ab/catalog';
import { normalizePhone } from '@ab/core';
import { t } from '@ab/web-kit';
import type { CreateStudentBody } from '@/features/people/students/api';

export type CreateStudentValues = {
  guardianPhone: string;
  guardianName: string;
  name: string;
  /** '' means not given. */
  age: string;
  gender: Gender | '';
  /** '' means not asked. */
  source: LeadSource | '';
  tz: string;
  program: Program;
  /** '' means none yet. */
  teacher_id: string;
  /** False means the number belongs to the guardian, the default (docs/30 §1). */
  contactIsSelf: boolean;
};

export const EMPTY_STUDENT: CreateStudentValues = {
  guardianPhone: '',
  guardianName: '',
  name: '',
  age: '',
  gender: '',
  source: '',
  tz: 'Asia/Riyadh', // data default (docs/34 —): the family's zone until one is picked
  program: 'quran',
  teacher_id: '',
  contactIsSelf: false,
};

/** Blank or spaces-only counts as empty. */
export function requiredError(value: string): string | undefined {
  return value.trim() ? undefined : t.common.required;
}

/** Arabic reason when the phone cannot become E.164 (R-STU-02); the API re-checks. */
export function phoneError(value: string): string | undefined {
  const r = normalizePhone(value);
  return r.ok ? undefined : t.common.phoneErrors[r.reason];
}

/** Null when blank, undefined when not a whole number from 3 to 99. */
export function parseAge(value: string): number | null | undefined {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 3 && n <= 99 ? n : undefined;
}

export function ageError(value: string): string | undefined {
  return parseAge(value) === undefined ? t.students.ageInvalid : undefined;
}

/** The guardian is found or created by phone; `leadId` converts that lead and links it. */
export function toCreateBody(
  v: CreateStudentValues,
  force: boolean,
  leadId?: string,
): CreateStudentBody {
  return {
    name: v.name.trim(),
    age: parseAge(v.age) ?? null,
    gender: v.gender || null,
    tz: v.tz,
    program: v.program,
    ...(v.teacher_id ? { teacher_id: v.teacher_id } : {}),
    ...(v.contactIsSelf ? { contact_is_self: true } : {}),
    guardian: {
      name: v.guardianName.trim(),
      phone_e164: v.guardianPhone,
      tz: v.tz,
      source: v.source || null,
    },
    force,
    ...(leadId ? { lead_id: leadId } : {}),
  };
}
