import { permissionsView, type PermissionsView } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { meQuery } from './me';

export type { Can } from '@ab/client-core';

/** The signed-in user's permissions (from /auth/me) and a `can('payments.read')` helper; nothing until it loads (D6). */
export function usePermissions(): PermissionsView {
  return permissionsView(useQuery(meQuery).data);
}
