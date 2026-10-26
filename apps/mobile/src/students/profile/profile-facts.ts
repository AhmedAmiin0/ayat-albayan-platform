import { teacherName } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import type { StudentProfile } from '../shared/types';
import { locale } from '@/core/lib/i18n/locale';

export interface Fact {
  label: string;
  value: string;
  /** IANA zone and the like: render inside <Ltr>. */
  ltr?: boolean;
}

const filled = (v: string | null): v is string => v !== null && v.trim() !== '';

/**
 * The quick view's facts, in the registration form's order: age and gender first, then the
 * profile form's fields. Empty ones are left out, the teacher never.
 */
export function profileFacts(s: StudentProfile): Fact[] {
  const text: [string, string | null][] = [
    [t.students.level, s.level],
    [t.students.memorized, s.memorized],
    [t.students.goal, s.goal],
    [t.students.riwaya, s.riwaya],
  ];
  return [
    ...(s.age ? [{ label: t.students.age, value: String(s.age) }] : []),
    ...(s.gender ? [{ label: t.students.gender, value: t.enums.gender[s.gender] }] : []),
    { label: t.students.program, value: t.enums.program[s.program] },
    ...text.flatMap(([label, value]) => (filled(value) ? [{ label, value: value.trim() }] : [])),
    ...(filled(s.tz) ? [{ label: t.students.tz, value: s.tz, ltr: true }] : []),
    { label: t.students.teacher, value: s.teacher ? teacherName(s.teacher, locale) : t.students.noTeacher },
  ];
}
