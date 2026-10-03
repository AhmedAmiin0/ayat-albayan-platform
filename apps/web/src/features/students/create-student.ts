import { normalizePhone, type Gender, type LeadSource, type Program } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { CreateStudentBody } from './api';

export type CreateStudentValues = {
  guardianPhone: string;
  guardianName: string;
  name: string;
  /** «سن الطالب» as typed; '' = not given. */
  age: string;
  gender: Gender | '';
  /** «عرفت عننا منين؟» for a new guardian; '' = not asked. */
  source: LeadSource | '';
  tz: string;
  program: Program;
  /** «المعلم/المعلمه»; '' = none yet (the form's empty option). */
  teacher_id: string;
};

export const EMPTY_STUDENT: CreateStudentValues = {
  guardianPhone: '',
  guardianName: '',
  name: '',
  age: '',
  gender: '',
  source: '',
  tz: 'Asia/Riyadh',
  program: 'quran',
  teacher_id: '',
};

/** «الخانة دي مطلوبة» for a blank (or spaces-only) value. */
export function requiredError(value: string): string | undefined {
  return value.trim() ? undefined : t.common.required;
}

/** Arabic reason when the phone cannot become E.164 (R-STU-02); the API re-checks. */
export function phoneError(value: string): string | undefined {
  const r = normalizePhone(value);
  return r.ok ? undefined : t.common.phoneErrors[r.reason];
}

/** «سن الطالب» as the form validated it: null when blank, undefined when not a whole 3–99. */
export function parseAge(value: string): number | null | undefined {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 3 && n <= 99 ? n : undefined;
}

/** The registration form's own message: «اكتب السن بالأرقام (من 3 لـ 99)». */
export function ageError(value: string): string | undefined {
  return parseAge(value) === undefined ? t.students.ageInvalid : undefined;
}

/** Form → POST /students. The guardian is found (or created) by phone; tz applies to both. */
export function toCreateBody(v: CreateStudentValues, force: boolean): CreateStudentBody {
  return {
    name: v.name.trim(),
    age: parseAge(v.age) ?? null,
    gender: v.gender || null,
    tz: v.tz,
    program: v.program,
    ...(v.teacher_id ? { teacher_id: v.teacher_id } : {}),
    guardian: { name: v.guardianName.trim(), phone_e164: v.guardianPhone, tz: v.tz, source: v.source || null },
    force,
  };
}
