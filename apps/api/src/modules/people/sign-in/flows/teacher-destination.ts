import type { ProfileRec, TeacherRec } from '@/modules/people/sign-in/sign-in.ports';

/**
 * none = no login yet; pending = an enabled `teacher` login whose first-time setup is not done
 * (its auth email is still the synthetic one, docs/46 A4); teacher = an enabled, set-up `teacher`
 * login; refused = any other login (never coded).
 */
type LoginState = 'none' | 'pending' | 'teacher' | 'refused';

const isTeacherLogin = (l: ProfileRec): boolean => l.role === 'teacher' && !l.disabled;

const loginState = (l: ProfileRec | null): LoginState => {
  if (!l) return 'none';
  return isTeacherLogin(l) ? 'teacher' : 'refused';
};

/**
 * D2 (docs/46): the code goes to `teachers.phone_e164` while she has no login AND while her login
 * is still setup-pending (owner 2026-11-11: a shared number leaves that login without a phone,
 * and she has no password yet); after setup, only to that login's own phone, so editing the
 * teacher record never redirects a set-up login's codes. A login of another role (an admin
 * linked to a teacher row) or a disabled one gets nothing.
 */
const DESTINATION: Record<LoginState, (t: TeacherRec) => string | null> = {
  none: (t) => t.recordPhone,
  pending: (t) => t.recordPhone,
  teacher: (t) => t.login?.phone ?? null,
  refused: () => null,
};

/**
 * Where a teacher's sign-in code goes; null = nowhere (the request still answers 202).
 * `setupPending`: her login's auth email is still `isFamilyEmail` (SignInAccounts.setupPending).
 */
export const teacherCodePhone = (t: TeacherRec, setupPending: boolean): string | null => {
  const state = loginState(t.login);
  return DESTINATION[state === 'teacher' && setupPending ? 'pending' : state](t);
};

/** Her own login when it is an enabled `teacher` one (phone + password sign-in, docs/46 A5). */
export const teacherLoginId = (t: TeacherRec | null): string | null =>
  t?.login && loginState(t.login) === 'teacher' ? t.login.id : null;
