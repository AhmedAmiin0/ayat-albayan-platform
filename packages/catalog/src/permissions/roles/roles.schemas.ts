import { z } from 'zod';
import { userRoleSchema, type UserRole } from './roles';
import {
  GRANTABLE_PERMISSIONS,
  PERMISSION_AREAS,
  permissionSchema,
  type Permission,
} from '../catalog';

// A role's base_role (its scope) is fixed at creation; only its names and grants change later.

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

export const roleViewSchema = z.object({
  id: z.string(),
  /** System roles: the user_role value; custom roles: 'custom-…'. */
  key: z.string(),
  name_ar: z.string(),
  name_en: z.string().nullable(),
  base_role: userRoleSchema,
  is_system: z.boolean(),
  /** Grantable keys only (self.* follow the base role). The system admin: always all of them. */
  permissions: z.array(permissionSchema),
  /** Users holding the role (a null profiles.role_id counts for its system role). */
  users: z.number().int().nonnegative(),
});
export type RoleView = z.infer<typeof roleViewSchema>;

export const staffUserViewSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  role: userRoleSchema,
  /** '' when no role holds the profile. */
  role_id: z.string(),
});
export type StaffUserView = z.infer<typeof staffUserViewSchema>;

/** One section of the permission matrix. */
export const permissionGroupSchema = z.object({
  area: z.enum(PERMISSION_AREAS),
  keys: z.array(permissionSchema),
});
export type PermissionGroup = z.infer<typeof permissionGroupSchema>;
