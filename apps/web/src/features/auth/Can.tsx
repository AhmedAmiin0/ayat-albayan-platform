import type { Permission } from '@ab/shared';
import type { ReactNode } from 'react';
import { usePermissions } from './usePermissions';

export interface CanProps {
  /** One permission, or several (`any` = one is enough, default: all are needed). */
  permission: Permission | readonly Permission[];
  any?: boolean;
  /** Shown instead of the children when not allowed (default: nothing). */
  fallback?: ReactNode;
  children: ReactNode;
}

/** Renders its children only when the signed-in user holds the permission(s). UI gating only. */
export function Can({ permission, any = false, fallback = null, children }: CanProps) {
  const { can } = usePermissions();
  const keys: readonly Permission[] = typeof permission === 'string' ? [permission] : permission;
  const allowed = any ? keys.some(can) : keys.every(can);
  return <>{allowed ? children : fallback}</>;
}
