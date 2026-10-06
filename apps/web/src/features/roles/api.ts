import type { RoleCreate, RoleUpdate, RoleView, StaffUserView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

// apps/api/src/modules/roles: «الأدوار والصلاحيات», all behind roles.manage.
export type { RoleView, StaffUserView } from '@ab/shared';

export const ROLES_KEY = ['roles'] as const;

export const rolesQuery = queryOptions({
  queryKey: [...ROLES_KEY, 'list'],
  queryFn: () => apiFetch<RoleView[]>('/roles'),
});

export const staffUsersQuery = queryOptions({
  queryKey: [...ROLES_KEY, 'users'],
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

/** «الإدارة», «معلم/ة», … for a base role. */
export const baseRoleLabel = (role: RoleView['base_role']): string => t.activity.roles[role];
