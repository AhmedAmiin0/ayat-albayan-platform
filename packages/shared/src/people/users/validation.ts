import { USER_ROLES, type UserRole } from '@ab/catalog';

// Rules of the user forms shared by the API (authoritative) and the web (early feedback).

export const PASSWORD_MAX = 72;
export const DEFAULT_PASSWORD_MIN = 8;

export type PasswordProblem = 'blank' | 'too_short' | 'too_long';

/** What is wrong with a typed password, or null. `min` comes from the API config. */
export function passwordProblem(password: string, min: number = DEFAULT_PASSWORD_MIN): PasswordProblem | null {
  if (password.trim() === '') return 'blank';
  if (password.length < min) return 'too_short';
  if (password.length > PASSWORD_MAX) return 'too_long';
  return null;
}

/** Base roles whose login must be LINKED to an existing record (registration creates the record). */
export const LINKED_ROLES = ['teacher', 'student', 'guardian'] as const satisfies readonly UserRole[];
export type LinkedRole = (typeof LINKED_ROLES)[number];

export const isLinkedRole = (role: UserRole): role is LinkedRole => LINKED_ROLES.some((r) => r === role);

/** Students and guardians cannot be created here, only linked. */
export const needsExistingRecord = (role: UserRole): boolean => role === 'student' || role === 'guardian';

/** Staff base roles: logins that can hold permissions today. */
export const STAFF_BASE_ROLES = USER_ROLES.filter((r) => r !== 'student' && r !== 'guardian');

/** The AB-nnnn code of a student, typed in any case with or without the dash. */
export function normalizeStudentCode(value: string): string | null {
  const m = /^ab-?(\d{1,})$/i.exec(value.trim());
  return m?.[1] ? `AB-${m[1].padStart(4, '0')}` : null;
}
