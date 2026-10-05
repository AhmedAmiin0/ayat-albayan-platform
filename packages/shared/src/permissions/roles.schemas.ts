import { z } from 'zod';
import type { UserRole } from '../roles.js';
import { GRANTABLE_PERMISSIONS, type Permission } from './catalog.js';

// «الأدوار والصلاحيات»: the bodies of POST/PATCH /roles and PATCH /users/:id/role, and the rows
// the API answers with. A role's base_role (its scope: own lessons, own students, …) is fixed at
// creation; only its names and grants change afterwards.

/** Base roles a custom role may build on: staff only (guardians have no admin pages). */
export const STAFF_ROLES = ['admin', 'teacher', 'assistant', 'sales'] as const satisfies readonly UserRole[];
export type StaffRole = (typeof STAFF_ROLES)[number];

const grantable = z.enum(GRANTABLE_PERMISSIONS as [Permission, ...Permission[]]);
const names = {
  name_ar: z.string().trim().min(1).max(60),
  name_en: z.string().trim().max(60).nullish(),
};

export const roleCreateSchema = z.object({
  ...names,
  base_role: z.enum(STAFF_ROLES),
  permissions: z.array(grantable).max(GRANTABLE_PERMISSIONS.length),
});
export type RoleCreate = z.output<typeof roleCreateSchema>;

export const roleUpdateSchema = z.object({
  name_ar: names.name_ar.optional(),
  name_en: names.name_en,
  permissions: z.array(grantable).max(GRANTABLE_PERMISSIONS.length).optional(),
});
export type RoleUpdate = z.output<typeof roleUpdateSchema>;

export const roleAssignSchema = z.object({ role_id: z.uuid() });

export interface RoleView {
  id: string;
  /** System roles: the user_role value; custom roles: 'custom-…'. */
  key: string;
  name_ar: string;
  name_en: string | null;
  base_role: UserRole;
  is_system: boolean;
  /** Grantable keys only (self.* follow the base role). The system admin: always all of them. */
  permissions: Permission[];
  /** Users holding the role (a null profiles.role_id counts for its system role). */
  users: number;
}

/** A row of the «المستخدمون» table: a staff profile and the role it holds. */
export interface StaffUserView {
  id: string;
  full_name: string;
  role: UserRole;
  role_id: string;
}
