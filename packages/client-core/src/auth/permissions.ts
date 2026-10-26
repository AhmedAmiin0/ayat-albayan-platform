import { isPermission, type Permission } from '@ab/shared';

export type Can = (permission: Permission) => boolean;

/** What a screen reads to show or hide its actions. */
export interface PermissionsView {
  permissions: readonly Permission[];
  can: Can;
}

/** The `permissions` of GET /auth/me, unknown keys dropped (an older app on a newer API). */
export function permissionsOf(me: unknown): Permission[] {
  if (typeof me !== 'object' || me === null) return [];
  const list: unknown = Reflect.get(me, 'permissions');
  return Array.isArray(list) ? list.filter(isPermission) : [];
}

/**
 * The one permissions behaviour of web and mobile (docs/27 E2, owner D6): until /auth/me has answered
 * (loading, offline, signed out) nothing is granted, so actions stay hidden; then only the listed keys.
 * The API refuses anything not granted anyway.
 */
export function permissionsView(me: unknown): PermissionsView {
  const permissions = permissionsOf(me);
  return { permissions, can: (permission) => permissions.includes(permission) };
}
