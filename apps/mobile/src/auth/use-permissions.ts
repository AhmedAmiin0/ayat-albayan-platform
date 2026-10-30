import { meLoaded, permissionsOf, permissionsView, type Can } from '@ab/client-core';
import { sendsAllTemplates, type Permission } from '@ab/shared';
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

/** The signed-in profile's id from /auth/me; '' until it answers, and signed out (no fetch). */
export function useMeId(signedIn: boolean): string {
  const me = useQuery({ ...meQuery(), enabled: signedIn });
  const id: unknown = signedIn && meLoaded(me.data) ? Reflect.get(me.data, 'id') : null;
  return typeof id === 'string' ? id : '';
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

/** Every template from the picker (shared sendsAllTemplates: never an assistant); false until /auth/me answers. */
export function useSendsAllTemplates(): boolean {
  const me = useQuery(meQuery());
  const role: unknown = typeof me.data === 'object' && me.data !== null ? Reflect.get(me.data, 'role') : null;
  return sendsAllTemplates({ role: typeof role === 'string' ? role : null, permissions: permissionsOf(me.data) });
}
