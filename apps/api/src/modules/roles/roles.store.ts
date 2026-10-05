import type { UserRole } from '@ab/shared';

// What the roles service needs from the DB. RolesQueries implements it on supabase-js; the unit
// tests use an in-memory fake (roles.fakes.ts).

export interface RoleRecord {
  id: string;
  key: string;
  name_ar: string;
  name_en: string | null;
  base_role: UserRole;
  is_system: boolean;
  /** role_permissions rows, as stored. */
  permissions: string[];
}

export interface ProfileRecord {
  id: string;
  full_name: string;
  role: UserRole;
  /** null = the system role of `role`. */
  role_id: string | null;
}

export interface NewRole {
  key: string;
  name_ar: string;
  name_en: string | null;
  base_role: UserRole;
}

export interface RoleNames {
  name_ar?: string;
  name_en?: string | null;
}

export interface RoleStore {
  roles(): Promise<RoleRecord[]>;
  profiles(): Promise<ProfileRecord[]>;
  insertRole(row: NewRole): Promise<string>;
  renameRole(id: string, names: RoleNames): Promise<void>;
  /** Replaces the role's rows with exactly `permissions`. */
  setPermissions(id: string, permissions: readonly string[]): Promise<void>;
  deleteRole(id: string): Promise<void>;
  /** profiles.role = base role, profiles.role_id = custom role id or null (system role). */
  setProfileRole(id: string, change: { role: UserRole; role_id: string | null }): Promise<void>;
}

export const ROLE_STORE = Symbol('ROLE_STORE');
