import type { APIRequestContext } from '@playwright/test';
import type { RoleView } from '@ab/shared';
import { API, call } from './assistant-api';

// Helpers of the sales options specs (owner 2026-10-12, docs/16 rows 23–26): the system sales role's
// grants through the admin's «الأدوار والصلاحيات» API, and the Riyadh day. Real API and database.

/** Today in Riyadh (UTC+3, no DST), YYYY-MM-DD, shifted by `days`. */
export const riyadhDay = (days = 0): string => new Date(Date.now() + 3 * 3_600_000 + days * 86_400_000).toISOString().slice(0, 10);

/** The built-in sales role as the admin sees it. */
export async function salesRole(request: APIRequestContext, admin: string): Promise<RoleView> {
  const roles = await call<RoleView[]>(request, { token: admin, method: 'GET', path: '/roles' });
  const role = roles.body.find((r) => r.is_system && r.key === 'sales');
  if (!role) throw new Error(`no system sales role (${roles.status})`);
  return role;
}

/** PATCH the sales role without `permission` (the admin switching the option off). */
export async function revokeFromSales(request: APIRequestContext, input: { admin: string; permission: string }): Promise<void> {
  const role = await salesRole(request, input.admin);
  const res = await request.fetch(`${API}/roles/${role.id}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${input.admin}` },
    data: { permissions: role.permissions.filter((p) => p !== input.permission) },
  });
  if (!res.ok()) throw new Error(`revoke ${res.status()} ${await res.text()}`);
}

/** «استعادة الافتراضي» on the sales role (POST /roles/:id/reset). */
export async function resetSales(request: APIRequestContext, admin: string): Promise<RoleView> {
  const role = await salesRole(request, admin);
  const res = await call<RoleView>(request, { token: admin, method: 'POST', path: `/roles/${role.id}/reset` });
  if (res.status !== 200) throw new Error(`reset ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}
