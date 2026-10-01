import { normalizePhone, type Program } from '@ab/shared';
import { t } from '@/lib/i18n';
import type { CreateStudentBody } from './api';

export type CreateStudentValues = {
  guardianPhone: string;
  guardianName: string;
  name: string;
  tz: string;
  program: Program;
};

export const EMPTY_STUDENT: CreateStudentValues = {
  guardianPhone: '',
  guardianName: '',
  name: '',
  tz: 'Asia/Riyadh',
  program: 'quran',
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

/** Form → POST /students. The guardian is found (or created) by phone; tz applies to both. */
export function toCreateBody(v: CreateStudentValues, force: boolean): CreateStudentBody {
  return {
    name: v.name.trim(),
    tz: v.tz,
    program: v.program,
    guardian: { name: v.guardianName.trim(), phone_e164: v.guardianPhone, tz: v.tz },
    force,
  };
}
