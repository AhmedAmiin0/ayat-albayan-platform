import type { RoleCreateInput, RoleUpdateInput, RoleView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';

// apps/api/src/modules/roles. The roles screen is admin only (roles.view / roles.manage).
export type { RoleView } from '@ab/shared';

export const ROLES_KEY = ['roles'] as const;

export const rolesQuery = queryOptions({
  queryKey: ROLES_KEY,
  queryFn: () => apiFetch<RoleView[]>('/roles'),
});

export const createRole = (body: RoleCreateInput) => apiSend<RoleView>('POST', '/roles', body);
export const updateRole = ({ id, body }: { id: string; body: RoleUpdateInput }) =>
  apiSend<RoleView>('PATCH', `/roles/${id}`, body);
export const deleteRole = (id: string) => apiSend('DELETE', `/roles/${id}`);
export const duplicateRole = ({ id, names }: { id: string; names: { name_ar: string; name_en: string } }) =>
  apiSend<RoleView>('POST', `/roles/${id}/duplicate`, names);

const KNOWN: Record<string, string> = {
  duplicate: t.roles.error.duplicate,
  system_immutable: t.roles.error.systemImmutable,
  key_immutable: t.roles.error.systemImmutable,
  admin_wildcard: t.roles.error.adminWildcard,
  wildcard_reserved: t.roles.error.wildcardReserved,
  permission_not_held: t.roles.error.notHeld,
  own_role: t.roles.error.ownRole,
  validation_failed: t.roles.error.validation,
};

/** The API's `{ message, count? }` → one Arabic sentence («لا يمكن حذف الدور… {count}»). */
export function roleErrorText(e: unknown): string {
  const body = e instanceof ApiError && typeof e.body === 'object' ? (e.body as { message?: unknown; count?: unknown; field?: unknown }) : null;
  if (body?.message === 'role_has_users') {
    if (body.field === 'base_role') return t.roles.error.hasUsers;
    return t.roles.delete.blocked.replace('{count}', String(body.count ?? ''));
  }
  return (typeof body?.message === 'string' && KNOWN[body.message]) || t.roles.error.generic;
}
