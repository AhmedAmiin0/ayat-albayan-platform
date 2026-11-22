/** Mirrors the `user_role` DB enum. */
export const USER_ROLES = ['admin', 'teacher', 'guardian', 'assistant', 'sales', 'student'] as const;
export type UserRole = (typeof USER_ROLES)[number];

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
  student: '/portal',
};
