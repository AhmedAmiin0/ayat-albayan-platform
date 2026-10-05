import { permissionKey, type ModulePermission, type PermissionModule } from './catalogue.js';

/** `method` undefined = any method. GET/HEAD need a `.view`, writes a `.manage` (see `pair`). */
export interface RouteRule {
  method?: string;
  /** Path prefix, matched segment by segment; a `:param` segment matches any one segment. */
  prefix: string;
  permission: ModulePermission;
}

/** The standard pair: reads need module.view, every other method module.manage. */
export function pair(prefix: string, module: PermissionModule): RouteRule[] {
  return [
    { method: 'GET', prefix, permission: permissionKey(module, 'view') },
    { prefix, permission: permissionKey(module, 'manage') },
  ];
}

/** A read-only exception inside a manage prefix (a POST that only computes, e.g. a price quote). */
export const readOnly = (method: string, prefix: string, module: PermissionModule): RouteRule => ({
  method,
  prefix,
  permission: permissionKey(module, 'view'),
});

/**
 * Self-service routes every admitted role may call, whatever its permissions: the caller's own
 * device tokens and the sign-in/out reports of the web. Exempt means "no permission needed",
 * the route's @Roles still applies.
 */
export const EXEMPT_PREFIXES: readonly string[] = ['/auth', '/me', '/activity/session', '/health'];
