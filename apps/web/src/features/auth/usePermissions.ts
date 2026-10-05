import { can, type Permission } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { meQuery } from './me';

export interface Permissions {
  /** Server-resolved permission keys of the signed-in user (empty until /auth/me answers). */
  permissions: readonly string[];
  /** Grants `key`: the wildcard grants all, `x.manage` grants `x.view`. False while loading. */
  can: (key: Permission) => boolean;
  /** Any of the keys. */
  canAny: (keys: readonly Permission[]) => boolean;
  isLoading: boolean;
}

const NONE: readonly string[] = [];

/** The caller's permissions from the cached /auth/me (UI gating only; the API enforces them). */
export function usePermissions(): Permissions {
  const { data, isPending } = useQuery(meQuery);
  const permissions = data?.permissions ?? NONE;
  return useMemo(
    () => ({
      permissions,
      can: (key) => can(permissions, key),
      canAny: (keys) => keys.some((k) => can(permissions, k)),
      isLoading: isPending,
    }),
    [permissions, isPending],
  );
}
