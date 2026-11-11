import type { TeacherRec } from '@/modules/people/sign-in/sign-in.ports';

/**
 * none = no login yet; teacher = an enabled `teacher` login; refused = any other login (never
 * coded).
 */
type LoginState = 'none' | 'teacher' | 'refused';

const stateOf = (t: TeacherRec): LoginState => {
  if (!t.login) return 'none';
  return t.login.role === 'teacher' && !t.login.disabled ? 'teacher' : 'refused';
};

/**
 * D2 (docs/46): the first code goes to `teachers.phone_e164`; once she has a login, only to that
 * login's own phone, so editing the teacher record never redirects an existing login's codes. A
 * login of another role (an admin linked to a teacher row) or a disabled one gets nothing.
 */
const DESTINATION: Record<LoginState, (t: TeacherRec) => string | null> = {
  none: (t) => t.recordPhone,
  teacher: (t) => t.login?.phone ?? null,
  refused: () => null,
};

/** Where a teacher's sign-in code goes; null = nowhere (the request still answers 202). */
export const teacherCodePhone = (t: TeacherRec): string | null => DESTINATION[stateOf(t)](t);

/** Her own login when it is an enabled `teacher` one (phone + password sign-in, docs/46 A5). */
export const teacherLoginId = (t: TeacherRec | null): string | null =>
  t?.login && stateOf(t) === 'teacher' ? t.login.id : null;
