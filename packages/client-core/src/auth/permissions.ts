import { isPermission, type Permission } from '@ab/shared';

export type Can = (permission: Permission) => boolean;

/** What a screen reads to show or hide its actions. */
export interface PermissionsView {
  /** /auth/me has answered (fetched now or restored from the cache). */
  loaded: boolean;
  permissions: readonly Permission[];
  can: Can;
}

/** Has /auth/me answered? (undefined while loading, null when signed out). No list = holds nothing. */
export function meLoaded(me: unknown): me is object {
  return typeof me === 'object' && me !== null;
}

/** The `permissions` of GET /auth/me, unknown keys dropped (an older app on a newer API). */
export function permissionsOf(me: unknown): Permission[] {
  if (!meLoaded(me)) return [];
  const list: unknown = Reflect.get(me, 'permissions');
  return Array.isArray(list) ? list.filter(isPermission) : [];
}

/**
 * The one permissions behaviour of web and mobile (docs/27 E2, owner D6): until /auth/me has answered
 * (loading, offline with nothing saved, signed out) nothing is granted, so actions stay hidden; then
 * only the listed keys. The API refuses anything not granted anyway.
 */
export function permissionsView(me: unknown): PermissionsView {
  const permissions = permissionsOf(me);
  return { loaded: meLoaded(me), permissions, can: (permission) => permissions.includes(permission) };
}
