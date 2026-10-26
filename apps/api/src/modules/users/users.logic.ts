import { isLinkedRole, type Permission, type UserRole } from '@ab/shared';
import { grantsOf, heldRole, isSystemAdmin, permissionsOf, roleView, type RoleState } from '../roles/roles.logic';
import type { RoleRecord } from '../roles/roles.store';
import { forbidden } from '../../common/http/errors';
import type { ProfilePatch, StaffProfile } from './store/users.store';

// Pure rules of «المستخدمون»: who may touch whom, and that the academy always keeps an active admin.

export interface UserState extends RoleState {
  profiles: readonly StaffProfile[];
}

/** First of `wanted` the actor does not hold (null = all held). */
export const missingFor = (actor: readonly Permission[], wanted: readonly Permission[]): Permission | null =>
  wanted.find((w) => !actor.includes(w)) ?? null;

/** 403 permission_not_held: the actor must hold every grant of the target's current role (no editing "up"). */
export function assertOutranks(actor: readonly Permission[], state: UserState, target: StaffProfile): void {
  const missing = missingFor(actor, grantsOf(state, target));
  if (missing) throw forbidden('permission_not_held', { permission: missing });
}

/** 403 permission_not_held: nobody is given a role beyond what they hold themselves. */
export function assertRoleAssignable(actor: readonly Permission[], state: UserState, role: RoleRecord): void {
  const missing = missingFor(actor, roleView(state, role).permissions);
  if (missing) throw forbidden('permission_not_held', { permission: missing });
}

/** The held role's grants the actor lacks: drives `assignable` in the role options. */
export const isAssignable = (actor: readonly Permission[], state: UserState, role: RoleRecord): boolean =>
  missingFor(actor, roleView(state, role).permissions) === null;

const active = (p: StaffProfile): boolean => p.disabled_at === null;

/** The system admin: base role admin holding the system admin role (role_id null). */
export const isSystemAdminProfile = (state: UserState, p: StaffProfile): boolean => {
  const role = heldRole(state, p);
  return p.role === 'admin' && role !== null && isSystemAdmin(role);
};

export type AdminProblem = 'last_admin' | 'self_lockout';

/**
 * After a change (already applied to `after`): an ACTIVE system admin must remain and somebody
 * active must still hold roles.manage (409 last_admin otherwise).
 */
export function adminProblem(after: UserState): AdminProblem | null {
  const live = { ...after, profiles: after.profiles.filter(active) };
  if (!live.profiles.some((p) => isSystemAdminProfile(live, p))) return 'last_admin';
  if (!live.profiles.some((p) => permissionsOf(live, p).includes('roles.manage'))) return 'last_admin';
  return null;
}

/** Changing your own role must leave you able to manage users (409 self_lockout). */
export function lockedOutOfUsers(after: UserState, actorId: string): boolean {
  const me = after.profiles.find((p) => p.id === actorId);
  return me ? !permissionsOf(after, me).includes('users.write') : false;
}

export const without = (state: UserState, id: string): UserState => ({ ...state, profiles: state.profiles.filter((p) => p.id !== id) });

export const replaced = (state: UserState, next: StaffProfile): UserState => ({
  ...state,
  profiles: state.profiles.map((p) => (p.id === next.id ? next : p)),
});

export const disabledCopy = (p: StaffProfile): StaffProfile => ({ ...p, disabled_at: p.disabled_at ?? 'now' });

export type RoleChoice = { role: UserRole; role_id: string | null };

/**
 * The (base role, role_id) a request names: a custom role fixes the base role; a bare base role
 * means that role's system role (role_id null). null = the request does not name a role.
 */
export function chooseRole(
  roles: readonly RoleRecord[],
  input: { role?: UserRole | undefined; role_id?: string | null | undefined },
): { choice: RoleChoice; record: RoleRecord } | 'unknown_role' | 'role_mismatch' | null {
  if (input.role_id) {
    const record = roles.find((r) => r.id === input.role_id);
    if (!record) return 'unknown_role';
    if (input.role && input.role !== record.base_role) return 'role_mismatch';
    return { choice: { role: record.base_role, role_id: record.is_system ? null : record.id }, record };
  }
  if (!input.role) return null;
  const record = roles.find((r) => r.is_system && r.base_role === input.role);
  return record ? { choice: { role: input.role, role_id: null }, record } : 'unknown_role';
}

/** The profile columns a PATCH names (only what was sent). */
export function profilePatch(input: { full_name?: string | undefined; phone_e164?: string | null | undefined; locale?: string | undefined; tz?: string | undefined }): ProfilePatch {
  const patch: ProfilePatch = {};
  if (input.full_name !== undefined) patch.full_name = input.full_name;
  if (input.phone_e164 !== undefined) patch.phone_e164 = input.phone_e164;
  if (input.locale !== undefined) patch.locale = input.locale;
  if (input.tz !== undefined) patch.tz = input.tz;
  return patch;
}

/** A base role change is refused when a teacher / student / guardian record is (or would be) involved. */
export const roleChangeBlocked = (ctx: { from: UserRole; to: UserRole; linked: boolean }): boolean =>
  ctx.from !== ctx.to && (ctx.linked || isLinkedRole(ctx.from) || isLinkedRole(ctx.to));
