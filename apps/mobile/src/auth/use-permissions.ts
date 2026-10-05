import { isPermission, type Permission } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

/** The `permissions` of GET /auth/me, unknown keys dropped (an older app on a newer API). */
export function permissionsOf(me: unknown): Permission[] {
  if (typeof me !== 'object' || me === null) return [];
  const list: unknown = Reflect.get(me, 'permissions');
  return Array.isArray(list) ? list.filter(isPermission) : [];
}

export type Can = (permission: Permission) => boolean;

/**
 * Dynamic roles: the app stays role-gated (admin tabs / teacher tabs, verify-role.ts), and the
 * admin screens that map to a permission hide what the held role does not grant. Until /auth/me
 * answers (offline, first paint) nothing is hidden: the API refuses anything not granted anyway.
 */
export function usePermissions(): Can {
  const me = useQuery({ queryKey: pathKey('/auth/me'), queryFn: () => apiFetch<unknown>('/auth/me') });
  // No answer yet, or an API from before dynamic roles (no `permissions`): hide nothing.
  if (typeof me.data !== 'object' || me.data === null || !Array.isArray(Reflect.get(me.data, 'permissions'))) return () => true;
  const held = permissionsOf(me.data);
  return (permission) => held.includes(permission);
}
