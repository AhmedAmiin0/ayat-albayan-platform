import type { UserRole } from './roles.js';
import { PERMISSION_AREAS, PERMISSION_ROWS, type PermissionArea } from './catalog.data.js';

export { PERMISSION_AREAS, PERMISSION_ROWS, type PermissionArea } from './catalog.data.js';

export type Permission = (typeof PERMISSION_ROWS)[number]['key'];

type Row = { key: Permission; area: PermissionArea; grants: readonly UserRole[] };
const ROWS: readonly Row[] = PERMISSION_ROWS;

/** Every permission key, catalog order. */
export const PERMISSIONS: readonly Permission[] = ROWS.map((r) => r.key);

/** What a role may be granted in the matrix: everything but the `self.*` scope keys. */
export const GRANTABLE_PERMISSIONS: readonly Permission[] = ROWS.filter((r) => r.area !== 'self').map((r) => r.key);

export function isPermission(value: unknown): value is Permission {
  return PERMISSIONS.some((p) => p === value);
}

export function isGrantable(value: unknown): value is Permission {
  return GRANTABLE_PERMISSIONS.some((p) => p === value);
}

/** The `self.*` keys a base role carries whatever its grants: teacher → self.teacher, … */
export function selfPermissionsOf(role: UserRole | null): Permission[] {
  if (!role) return [];
  return ROWS.filter((r) => r.area === 'self' && r.grants.includes(role)).map((r) => r.key);
}

/**
 * The grants a SYSTEM role is seeded with (migration 20261005000220): admin every grantable key,
 * the others the rows naming them. Together with selfPermissionsOf this is today's access.
 */
export function defaultGrantsOf(role: UserRole): Permission[] {
  if (role === 'admin') return [...GRANTABLE_PERMISSIONS];
  return ROWS.filter((r) => r.area !== 'self' && r.grants.includes(role)).map((r) => r.key);
}

export interface EffectiveInput {
  /** profiles.role of the user: decides the self.* scope keys. */
  baseRole: UserRole | null;
  /** role_permissions rows of the user's role; unknown and self.* keys are dropped. */
  granted: readonly string[];
  /** The system admin role: every grantable key, whatever its rows say. */
  allGrantable: boolean;
}

/** The permission set the API enforces for one user. */
export function effectivePermissions(input: EffectiveInput): Permission[] {
  if (!input.baseRole) return [];
  const grants = input.allGrantable ? GRANTABLE_PERMISSIONS : GRANTABLE_PERMISSIONS.filter((p) => input.granted.includes(p));
  return [...grants, ...selfPermissionsOf(input.baseRole)];
}

/** The system roles' effective sets: what the parity test compares with the old @Roles table. */
export function systemPermissionsOf(role: UserRole): Permission[] {
  return effectivePermissions({ baseRole: role, granted: defaultGrantsOf(role), allGrantable: role === 'admin' });
}

export interface PermissionGroup {
  area: PermissionArea;
  keys: Permission[];
}

/** Matrix sections (self.* left out), in PERMISSION_AREAS order. */
export function permissionGroups(): PermissionGroup[] {
  return PERMISSION_AREAS.filter((a) => a !== 'self').map((area) => ({
    area,
    keys: ROWS.filter((r) => r.area === area).map((r) => r.key),
  }));
}

/**
 * The built-in roles whose grants the admin may switch off (or on) and restore to defaultGrantsOf with
 * «استعادة الافتراضي» (owner 2026-10-12). The system admin stays fixed; self.* keys are never grants.
 */
export const EDITABLE_SYSTEM_ROLES = ['teacher', 'assistant', 'sales'] as const satisfies readonly UserRole[];
export type EditableSystemRole = (typeof EDITABLE_SYSTEM_ROLES)[number];

export function isEditableSystemRole(key: string): key is EditableSystemRole {
  return EDITABLE_SYSTEM_ROLES.some((r) => r === key);
}
