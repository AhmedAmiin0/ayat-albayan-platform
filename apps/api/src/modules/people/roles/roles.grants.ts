import type { Permission } from '@ab/shared';
import { badRequest, conflict, forbidden, notFound } from '@/common/http/errors';
import {
  isPortalRole,
  isSystemAdmin,
  managerProblem,
  missingGrant,
  type RoleState,
} from './roles.logic';
import type { ProfileRecord, RoleRecord } from './roles.store';

/**
 * RoleGrants: the checks every role change passes before it is written (RolesService orchestrates
 * the store, the cache and the audit row around them). Each one throws the HTTP error the API
 * returns, so a refused change never reaches the database.
 */

/** 403 permission_not_held: nobody is given, or changed beyond, what the actor itself holds. */
export function assertHolds(
  state: RoleState,
  actorId: string,
  wanted: readonly Permission[],
): void {
  const missing = missingGrant(state, actorId, wanted);
  if (missing) throw forbidden('permission_not_held', { permission: missing });
}

/** 409 last_admin / self_lockout on the state the change would leave behind. */
export function assertManagers(next: RoleState, actorId: string): void {
  const problem = managerProblem(next, actorId);
  if (problem) throw conflict(problem);
}

/** 404 role_not_found. */
export function findRole(state: RoleState, id: string): RoleRecord {
  const role = state.roles.find((r) => r.id === id);
  if (!role) throw notFound('role_not_found');
  return role;
}

const FIXED_GRANTS: readonly { fixed: (role: RoleRecord) => boolean; code: string }[] = [
  { fixed: isSystemAdmin, code: 'admin_role_fixed' },
  { fixed: isPortalRole, code: 'portal_role_fixed' },
];

/** 400 admin_role_fixed / portal_role_fixed: those grants never change. */
export function assertEditable(role: RoleRecord): void {
  const rule = FIXED_GRANTS.find((r) => r.fixed(role));
  if (rule) throw badRequest(rule.code);
}

const PORTAL_BASES: ReadonlySet<string> = new Set(['guardian', 'student']);

/** 400 not_staff: an unknown login, or a guardian / student role. */
export function staffTarget(
  state: RoleState,
  input: { userId: string; role: RoleRecord },
): ProfileRecord {
  const profile = state.profiles.find((p) => p.id === input.userId);
  if (!profile || PORTAL_BASES.has(input.role.base_role)) throw badRequest('not_staff');
  return profile;
}

/** The state with one role's grants replaced (what a regrant would leave). */
export function withGrants(state: RoleState, roleId: string, permissions: Permission[]): RoleState {
  return { ...state, roles: state.roles.map((r) => (r.id === roleId ? { ...r, permissions } : r)) };
}

/** The state with one profile moved to another role. */
export function withProfile(state: RoleState, moved: ProfileRecord): RoleState {
  return { ...state, profiles: state.profiles.map((p) => (p.id === moved.id ? moved : p)) };
}
