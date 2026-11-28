import { GRANTABLE_PERMISSIONS, selfPermissionsOf, type UserRole } from '@ab/catalog';
import type { QueryClient } from '@tanstack/react-query';
import { pathKey } from '@ab/mobile-kit';

// Tests not about permissions sign in as staff holding every key: since docs/27 E2 (D6)
// nothing is granted until /auth/me has answered.

/** /auth/me of staff holding every grantable key plus its own role's self.* scope. */
export function fullAccessMe(role: UserRole = 'admin') {
  return { role, permissions: [...GRANTABLE_PERMISSIONS, ...selfPermissionsOf(role)] };
}

/** Seeds that answer and keeps it (no refetch on mount); a test's own setQueryData replaces it. */
export function seedFullAccess(client: QueryClient, role: UserRole = 'admin'): void {
  client.setQueryDefaults(pathKey('/auth/me'), { staleTime: Infinity });
  client.setQueryData(pathKey('/auth/me'), fullAccessMe(role));
}
