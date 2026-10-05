import { can, isExemptRoute, permissionForRoute, WILDCARD, type Permission } from '@ab/shared';

export interface RouteCall {
  method: string;
  /** The route pattern (`/students/:id`) when the framework knows it, else the URL path. */
  path: string;
}

export type Verdict = { ok: true } | { ok: false; permission: Permission | null };

/**
 * Pure decision of the guard (tested without Nest): the wildcard always passes; an explicit
 * `@RequirePermission` is checked as is; an admin route needs the permission ROUTE_PERMISSIONS
 * maps it to; an unmapped admin route is denied to every non-wildcard role (safe default).
 */
export function decide(perms: ReadonlySet<string>, explicit: Permission | undefined, call: RouteCall): Verdict {
  if (perms.has(WILDCARD)) return { ok: true };
  if (explicit) return can(perms, explicit) ? { ok: true } : { ok: false, permission: explicit };
  if (isExemptRoute(call.path)) return { ok: true };
  const needed = permissionForRoute(call.method, call.path);
  if (!needed) return { ok: false, permission: null };
  return can(perms, needed) ? { ok: true } : { ok: false, permission: needed };
}
