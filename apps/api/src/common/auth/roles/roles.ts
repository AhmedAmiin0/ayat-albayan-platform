import type { Role } from '@/common/auth/verify-token';

type HasRole = (user: { role: Role | null }) => boolean;

const hasRole =
  (role: Role): HasRole =>
  (user) =>
    user.role === role;

/** The admin base role, not a custom role that only holds admin permissions. */
export const isAdmin = hasRole('admin');

/** The sales base role, which the assistant ownership rules bind. */
export const isSales = hasRole('sales');
