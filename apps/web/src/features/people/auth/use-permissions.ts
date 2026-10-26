import type { Permission } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { canDo, meQuery } from './me';

export type Can = (permission: Permission) => boolean;

/** The signed-in user's permissions (from /auth/me) and a `can('payments.read')` helper. */
export function usePermissions(): { permissions: readonly Permission[]; can: Can } {
  const me = useQuery(meQuery).data;
  return { permissions: me?.permissions ?? [], can: (permission) => canDo(me, permission) };
}
