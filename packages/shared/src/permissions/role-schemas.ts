import { z } from 'zod';
import { USER_ROLES } from '../roles.js';
import { isPermission, type Permission } from './catalogue.js';

export const roleKeySchema = z.string().regex(/^[a-z][a-z0-9_]{1,39}$/);
const name = z.string().trim().min(1).max(80);
const permissions = z
  .array(z.string().refine(isPermission, 'unknown_permission'))
  .max(100)
  .transform((list): Permission[] => [...new Set(list)].filter(isPermission));

export const roleCreateSchema = z.object({
  key: roleKeySchema,
  name_ar: name,
  name_en: name,
  base_role: z.enum(USER_ROLES),
  permissions: permissions.default([]),
});

/** key and base_role may be sent so the API can answer 409 for a system role; custom roles may re-base while empty. */
export const roleUpdateSchema = z
  .object({
    key: roleKeySchema,
    name_ar: name,
    name_en: name,
    base_role: z.enum(USER_ROLES),
    permissions,
  })
  .partial();

export type RoleCreateInput = z.output<typeof roleCreateSchema>;
export type RoleUpdateInput = z.output<typeof roleUpdateSchema>;

/** What GET /roles and GET /roles/:id return. */
export interface RoleView {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  base_role: (typeof USER_ROLES)[number];
  is_system: boolean;
  permissions: Permission[];
  user_count: number;
}

/** GET /auth/me. */
export interface MeView {
  id: string;
  email: string | null;
  role: (typeof USER_ROLES)[number] | null;
  fullName: string | null;
  locale: string | null;
  tz: string | null;
  roleKey: string | null;
  permissions: string[];
}
