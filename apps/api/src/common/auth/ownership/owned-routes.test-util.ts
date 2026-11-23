import { systemResolver } from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import type { RouteAccess } from '@/common/auth/parity/route-walk.test-util';
import type { OwnedRouteTests } from './ownership.schemas';
import type { RouteMapDiff } from './owned-routes.types';

/** The logins that must see only their own rows (audit OPS-9); admin and assistant see all. */
const SCOPED_ROLES: readonly NonNullable<AuthUser['role']>[] = ['teacher', 'guardian', 'student', 'sales'];

/** Every permission one of the scoped roles holds by default. */
export async function scopedPermissions(): Promise<ReadonlySet<unknown>> {
  const sets = await Promise.all(
    SCOPED_ROLES.map((role) => systemResolver({ id: role, email: null, role })),
  );
  return new Set<unknown>(sets.flat());
}

const hasParam = (r: RouteAccess) => r.route.includes('/:');

/** 'METHOD /path' of every id route a scoped login can call, sorted, once each. */
export function ownedRoutes(
  routes: readonly RouteAccess[],
  held: ReadonlySet<unknown>,
): string[] {
  const reached = (r: RouteAccess) => !r.isPublic && (r.signedIn || held.has(r.permission));
  const owned = routes.filter((r) => hasParam(r) && reached(r)).map((r) => r.route);
  return [...new Set(owned)].sort();
}

export function compareRouteMap(now: readonly string[], map: OwnedRouteTests): RouteMapDiff {
  const listed = Object.keys(map);
  return {
    unmapped: now.filter((r) => !listed.includes(r)),
    stale: listed.filter((r) => !now.includes(r)),
  };
}
