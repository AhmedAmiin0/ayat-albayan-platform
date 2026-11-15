import { permissionsView, type Can, type PermissionsView } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { meQuery } from './me';

export type { Can, PermissionsView };

/**
 * The signed-in user's permissions (from /auth/me), a `can('payments.read')` helper and `loaded`. One
 * behaviour with mobile (@ab/client-core, docs/27 E2, owner D6): nothing is granted until /auth/me has
 * answered, and the navigation shows a skeleton until `loaded` (never a partial menu).
 */
export function usePermissions(): PermissionsView {
  return permissionsView(useQuery(meQuery).data);
}
