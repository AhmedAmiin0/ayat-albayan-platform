import type { RoleCreate, RoleUpdate, RoleView, StaffUserView } from '@ab/catalog';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { roleKeys } from '@/features/people/keys';

// All behind roles.manage.
export type { RoleView, StaffUserView } from '@ab/catalog';

export const ROLES_KEY = roleKeys.all;

export const rolesQuery = queryOptions({
  queryKey: roleKeys.list(),
  queryFn: () => apiFetch<RoleView[]>('/roles'),
});

export const staffUsersQuery = queryOptions({
  queryKey: roleKeys.staffUsers(),
  queryFn: () => apiFetch<StaffUserView[]>('/roles/staff-users'),
});

export function saveRole(input: { id: string | null; body: RoleCreate | RoleUpdate }): Promise<RoleView> {
  return input.id ? apiSend<RoleView>('PATCH', `/roles/${input.id}`, input.body) : apiSend<RoleView>('POST', '/roles', input.body);
}

export const deleteRole = (id: string) => apiSend('DELETE', `/roles/${id}`);

export const assignRole = (input: { userId: string; roleId: string }) =>
  apiSend<StaffUserView>('PATCH', `/users/${input.userId}/role`, { role_id: input.roleId });

/** The role's name in the UI language (English falls back to the Arabic name). */
export function roleName(role: Pick<RoleView, 'name_ar' | 'name_en'>): string {
  return locale === 'en' ? (role.name_en ?? role.name_ar) : role.name_ar;
}

export const baseRoleLabel = (role: RoleView['base_role']): string => t.activity.roles[role];

/** Resets a system teacher, sales or assistant role to its default grants. */
export const resetRole = (id: string) => apiSend<RoleView>('POST', `/roles/${id}/reset`);
