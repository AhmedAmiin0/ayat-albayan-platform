import { roleCreateSchema, type RoleCreate, type RoleUpdate, type RoleView } from '@ab/catalog';
import { roleCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend, t, locale } from '@ab/web-kit';
import { roleKeys } from '@/features/people/keys';

// All behind roles.manage.
export type { RoleView, StaffUserView } from '@ab/catalog';

export const ROLES_KEY = roleKeys.all;

const roles = roleCalls({ apiFetch, apiSend });

export const rolesQuery = queryOptions({
  queryKey: roleKeys.list(),
  queryFn: roles.list,
});

export const staffUsersQuery = queryOptions({
  queryKey: roleKeys.staffUsers(),
  queryFn: roles.staffUsers,
});

export function saveRole(input: {
  id: string | null;
  body: RoleCreate | RoleUpdate;
}): Promise<RoleView> {
  if (input.id) return roles.update(input.id, input.body);
  // A new role's form always holds its base role; the parse proves it before the POST.
  return roles.create(roleCreateSchema.parse(input.body));
}

export const deleteRole = (id: string) => roles.remove(id);

export const assignRole = (input: { userId: string; roleId: string }) =>
  roles.assign(input.userId, { role_id: input.roleId });

/** The role's name in the UI language (English falls back to the Arabic name). */
export function roleName(role: Pick<RoleView, 'name_ar' | 'name_en'>): string {
  return locale === 'en' ? (role.name_en ?? role.name_ar) : role.name_ar;
}

export const baseRoleLabel = (role: RoleView['base_role']): string => t.activity.roles[role];

/** Resets a system teacher, sales or assistant role to its default grants. */
export const resetRole = (id: string) => roles.reset(id);
