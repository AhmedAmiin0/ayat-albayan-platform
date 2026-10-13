import { effectivePermissions, GRANTABLE_PERMISSIONS, isGrantable, type Permission, type RoleView, type StaffUserView } from '@ab/shared';
import type { ProfileRecord, RoleRecord } from './roles.store';

// Pure rules of «الأدوار والصلاحيات»: which role a profile holds, what it may do, and whether a
// change would leave the academy with nobody able to manage roles (or lock the actor out).

export interface RoleState {
  roles: readonly RoleRecord[];
  profiles: readonly ProfileRecord[];
}

/** The system admin: every grantable permission, always (its rows are not consulted). */
export const isSystemAdmin = (role: RoleRecord): boolean => role.is_system && role.key === 'admin';

/** The system guardian / student roles: their grants are the family portal's, fixed (a rename only). */
export const isPortalRole = (role: RoleRecord): boolean => role.is_system && (role.key === 'guardian' || role.key === 'student');

/** profiles.role_id, or the system role of profiles.role when null. */
export function heldRole(state: RoleState, profile: ProfileRecord): RoleRecord | null {
  if (profile.role_id) return state.roles.find((r) => r.id === profile.role_id) ?? null;
  return state.roles.find((r) => r.is_system && r.base_role === profile.role) ?? null;
}

export function permissionsOf(state: RoleState, profile: ProfileRecord): Permission[] {
  const role = heldRole(state, profile);
  if (!role) return [];
  return effectivePermissions({ baseRole: profile.role, granted: role.permissions, allGrantable: isSystemAdmin(role) });
}

/** The catalog keys a profile holds: self.* scope keys (they come with the base role, not a grant) left out. */
export const grantsOf = (state: RoleState, profile: ProfileRecord): Permission[] => permissionsOf(state, profile).filter(isGrantable);

/** First of `wanted` the actor does not hold (null = all held): nobody grants beyond their own reach. */
export function missingGrant(state: RoleState, actorId: string, wanted: readonly Permission[]): Permission | null {
  const actor = state.profiles.find((p) => p.id === actorId);
  const held = actor ? permissionsOf(state, actor) : [];
  return wanted.find((w) => !held.includes(w)) ?? null;
}

export type ManagerProblem = 'last_admin' | 'self_lockout';

/**
 * After a change (already applied to `state`): somebody must still hold roles.manage, and the
 * actor making the change must keep it too (no locking yourself out).
 */
export function managerProblem(state: RoleState, actorId: string): ManagerProblem | null {
  const managers = state.profiles.filter((p) => permissionsOf(state, p).includes('roles.manage'));
  if (managers.length === 0) return 'last_admin';
  if (!managers.some((p) => p.id === actorId)) return 'self_lockout';
  return null;
}

export function roleView(state: RoleState, role: RoleRecord): RoleView {
  const permissions = isSystemAdmin(role) ? [...GRANTABLE_PERMISSIONS] : GRANTABLE_PERMISSIONS.filter((p) => role.permissions.includes(p));
  return {
    id: role.id,
    key: role.key,
    name_ar: role.name_ar,
    name_en: role.name_en,
    base_role: role.base_role,
    is_system: role.is_system,
    permissions,
    users: state.profiles.filter((p) => heldRole(state, p)?.id === role.id).length,
  };
}

export function staffUserView(state: RoleState, profile: ProfileRecord): StaffUserView {
  const held = heldRole(state, profile);
  return { id: profile.id, full_name: profile.full_name, role: profile.role, role_id: held?.id ?? '' };
}

/** Grantable keys only, deduplicated, catalog order. */
export function cleanGrants(permissions: readonly string[]): Permission[] {
  return GRANTABLE_PERMISSIONS.filter((p) => permissions.includes(p) && isGrantable(p));
}

/** A stable key for a custom role: 'custom-' + 8 hex. */
export function customKey(random: () => number = Math.random): string {
  const hex = Array.from({ length: 8 }, () => Math.floor(random() * 16).toString(16)).join('');
  return `custom-${hex}`;
}
