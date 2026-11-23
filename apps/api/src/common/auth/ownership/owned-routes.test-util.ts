import { systemPermissionsOf, type UserRole } from '@ab/shared';
import type { RouteAccess } from '@/common/auth/parity/route-walk.test-util';
import type { OwnershipBaseline } from './ownership.schemas';
import type { BaselineDiff } from './owned-routes.types';

/** The logins that must see only their own rows (audit OPS-9); admin and assistant see all. */
const SCOPED_ROLES: readonly UserRole[] = ['teacher', 'guardian', 'student', 'sales'];

const HELD = new Set<unknown>(SCOPED_ROLES.flatMap((role) => systemPermissionsOf(role)));

const hasParam = (r: RouteAccess) => r.route.includes('/:');
const reachedByScopedRole = (r: RouteAccess) =>
  !r.isPublic && (r.signedIn || HELD.has(r.permission));

/** 'METHOD /path' of every id route a scoped login can call, sorted, once each. */
export function ownedRoutes(routes: readonly RouteAccess[]): string[] {
  const owned = routes.filter((r) => hasParam(r) && reachedByScopedRole(r)).map((r) => r.route);
  return [...new Set(owned)].sort();
}

export function compareBaseline(now: readonly string[], baseline: OwnershipBaseline): BaselineDiff {
  const listed = Object.keys(baseline);
  return {
    added: now.filter((r) => !listed.includes(r)),
    stale: listed.filter((r) => !now.includes(r)),
  };
}
