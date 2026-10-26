import { GRANTABLE_PERMISSIONS, selfPermissionsOf, type UserRole } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { pathKey } from '@/core/lib/query/query-keys';

// Tests that are not about permissions sign in as staff holding every key: since docs/27 E2 (owner D6)
// nothing is granted until /auth/me has answered, where it used to hide nothing.

/** /auth/me of a signed-in staff member holding every grantable key plus its own role's self.* scope. */
export function fullAccessMe(role: UserRole = 'admin') {
  return { role, permissions: [...GRANTABLE_PERMISSIONS, ...selfPermissionsOf(role)] };
}

/** Seeds that answer and keeps it (no refetch on mount); a test's own setQueryData replaces it. */
export function seedFullAccess(client: QueryClient, role: UserRole = 'admin'): void {
  client.setQueryDefaults(pathKey('/auth/me'), { staleTime: Infinity });
  client.setQueryData(pathKey('/auth/me'), fullAccessMe(role));
}
