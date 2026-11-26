import { z } from 'zod';

/** Mirrors the `user_role` DB enum. */
export const USER_ROLES = ['admin', 'teacher', 'guardian', 'assistant', 'sales', 'student'] as const;
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export function isUserRole(value: unknown): value is UserRole {
  return userRoleSchema.validate(value);
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
