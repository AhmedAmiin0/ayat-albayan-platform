import type { Enums } from '@ab/db';

export type UserRole = Enums<'user_role'>;

/** Mirrors the `user_role` DB enum. `satisfies` breaks the build if the enum drifts. */
export const USER_ROLES = ['admin', 'teacher', 'guardian', 'assistant', 'sales'] as const satisfies readonly UserRole[];

export function isUserRole(value: unknown): value is UserRole {
  return USER_ROLES.some((r) => r === value);
}

/** Landing route per role after login (web). */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  teacher: '/teacher',
  guardian: '/portal',
  assistant: '/assistant',
  sales: '/sales',
};
