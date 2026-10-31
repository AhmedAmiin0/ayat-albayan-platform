import { meLoaded, permissionsOf, permissionsView, type Can } from '@ab/client-core';
import {
  canHideMessages,
  canUnhideMessages,
  sendsAllTemplates,
  type Permission,
} from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

export { permissionsOf, type Can };

const meQuery = () => ({ queryKey: pathKey('/auth/me'), queryFn: () => apiFetch<unknown>('/auth/me') });

/**
 * Dynamic roles: the app stays role-gated (admin, teacher, sales and assistant trees, verify-role.ts), and the
 * admin screens that map to a permission hide what the held role does not grant. One behaviour with web
 * (@ab/client-core, docs/27 E2, owner D6): until /auth/me has answered nothing is granted. The tab bars never
 * see that state: the startup screen stays up until /auth/me is loaded (useMeReady).
 */
export function usePermissions(): Can {
  return permissionsView(useQuery(meQuery()).data).can;
}

/**
 * Is /auth/me loaded (the persisted copy or a live answer) for a signed-in gate? Fetches it while it is
 * missing. Signed out (or still booting) needs none. The root layout keeps «جارٍ الاتصال» up until true.
 */
export function useMeReady(signedIn: boolean): boolean {
  const me = useQuery({ ...meQuery(), enabled: signedIn });
  return !signedIn || meLoaded(me.data);
}

/**
 * Does /auth/me list this key? false until it answers, as usePermissions. For a key that switches a
 * screen to another role's view (self.sales: a salesperson's chat).
 */
export function useHolds(permission: Permission): boolean {
  const me = useQuery(meQuery());
  return permissionsOf(me.data).includes(permission);
}

/** Strict: is /auth/me a base-role admin? false until it answers (the Google card's API is admins only). */
export function useIsAdmin(): boolean {
  const me = useQuery(meQuery());
  return typeof me.data === 'object' && me.data !== null && Reflect.get(me.data, 'role') === 'admin';
}

/** /auth/me's base role, null until it answers. */
function roleOf(data: unknown): string | null {
  const role: unknown = typeof data === 'object' && data !== null ? Reflect.get(data, 'role') : null;
  return typeof role === 'string' ? role : null;
}

/** Every template from the picker (shared sendsAllTemplates: never an assistant); false until /auth/me answers. */
export function useSendsAllTemplates(): boolean {
  const me = useQuery(meQuery());
  return sendsAllTemplates({ role: roleOf(me.data), permissions: permissionsOf(me.data) });
}

/**
 * «حذف من المنصة» (admin, sales) and «إظهار» (the admin) on WhatsApp bubbles; false until /auth/me
 * answers.
 */
export function useHideRights(): { hide: boolean; unhide: boolean } {
  const me = useQuery(meQuery());
  const who = { role: roleOf(me.data), permissions: permissionsOf(me.data) };
  return { hide: canHideMessages(who), unhide: canUnhideMessages(who) };
}
