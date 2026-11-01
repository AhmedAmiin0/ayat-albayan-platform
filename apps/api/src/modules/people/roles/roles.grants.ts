import type { Permission } from '@ab/shared';
import { badRequest, conflict, forbidden, notFound } from '@/common/http/errors';
import {
  cleanGrants,
  grantsOf,
  isPortalRole,
  isSystemAdmin,
  managerProblem,
  missingGrant,
  roleView,
  type RoleState,
} from './roles.logic';
import type { Regrant } from './roles.reset';
import type { ProfileRecord, RoleRecord } from './roles.store';

/** A base role and custom role id written to profiles (null = the system role of `role`). */
export interface RoleChoice {
  role: RoleRecord['base_role'];
  role_id: string | null;
}

/** Roles whose grants are fixed, with the 400 code an edit gets. */
const FIXED_ROLES: { fixed: (role: RoleRecord) => boolean; code: string }[] = [
  { fixed: isSystemAdmin, code: 'admin_role_fixed' },
  { fixed: isPortalRole, code: 'portal_role_fixed' },
];

const isFamilyBase = (role: RoleRecord): boolean =>
  role.base_role === 'guardian' || role.base_role === 'student';

/**
 * The grant policy of «الأدوار والصلاحيات»: nobody is given, or changed beyond, what the actor
 * holds (403 permission_not_held), and no change may leave nobody with roles.manage
 * (409 last_admin) or take it from the actor (409 self_lockout). Pure: every check runs before
 * anything is written.
 */
export const RoleGrants = {
  /** 404 role_not_found. */
  find(state: RoleState, id: string): RoleRecord {
    const role = state.roles.find((r) => r.id === id);
    if (!role) throw notFound('role_not_found');
    return role;
  },

  /** 403 permission_not_held with the first grant the actor lacks. */
  assertHolds(state: RoleState, actorId: string, wanted: readonly Permission[]): void {
    const missing = missingGrant(state, actorId, wanted);
    if (missing) throw forbidden('permission_not_held', { permission: missing });
  },

  /** 409 last_admin / self_lockout for the state after the change. */
  assertManagers(next: RoleState, actorId: string): void {
    const problem = managerProblem(next, actorId);
    if (problem) throw conflict(problem);
  },

  /** 400 admin_role_fixed / portal_role_fixed: those grants never change. */
  assertEditable(role: RoleRecord): void {
    const rule = FIXED_ROLES.find((r) => r.fixed(role));
    if (rule) throw badRequest(rule.code);
  },

  /** 409 system_role / role_in_use. */
  assertRemovable(state: RoleState, role: RoleRecord): void {
    if (role.is_system) throw conflict('system_role');
    if (roleView(state, role).users > 0) throw conflict('role_in_use');
  },

  /**
   * The state after a grant change. The actor must hold every grant being added AND every grant the
   * role has today: a limited manager cannot strip a role that carries more than it does.
   */
  regranted(change: Regrant): RoleState {
    const { state, role, permissions, actorId } = change;
    RoleGrants.assertHolds(state, actorId, [...cleanGrants(role.permissions), ...permissions]);
    const roles = state.roles.map((r) => (r.id === role.id ? { ...r, permissions } : r));
    const next = { ...state, roles };
    RoleGrants.assertManagers(next, actorId);
    return next;
  },

  /**
   * One profile moved to `role`; 400 not_staff for a family role or an unknown profile. The actor
   * must outrank the target: it holds the new role's grants AND the target's current ones, so a
   * limited manager cannot demote the system admin or anyone above it.
   */
  assigned(input: { state: RoleState; role: RoleRecord; profileId: string; actorId: string }) {
    const { state, role, actorId } = input;
    const profile = state.profiles.find((p) => p.id === input.profileId);
    if (!profile || isFamilyBase(role)) throw badRequest('not_staff');
    RoleGrants.assertHolds(state, actorId, [
      ...roleView(state, role).permissions,
      ...grantsOf(state, profile),
    ]);
    const change: RoleChoice = { role: role.base_role, role_id: role.is_system ? null : role.id };
    const moved: ProfileRecord = { ...profile, ...change };
    const profiles = state.profiles.map((p) => (p.id === profile.id ? moved : p));
    const next = { ...state, profiles };
    RoleGrants.assertManagers(next, actorId);
    return { change, moved, next };
  },
};
