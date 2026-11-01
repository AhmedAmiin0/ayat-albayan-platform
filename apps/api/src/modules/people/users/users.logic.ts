import { isLinkedRole, USER_ROLES, type Permission, type UserRole } from '@ab/shared';
import { z } from 'zod';
import { grantsOf, heldRole, isSystemAdmin, permissionsOf, roleView, type RoleState } from '@/modules/people/roles/roles.logic';
import type { RoleRecord } from '@/modules/people/roles/roles.store';
import { forbidden } from '@/common/http/errors';
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

type AdminProblem = 'last_admin' | 'self_lockout';

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

type RoleChoice = { role: UserRole; role_id: string | null };
type Roles = readonly RoleRecord[];
type Chosen = { choice: RoleChoice; record: RoleRecord } | 'unknown_role' | 'role_mismatch' | null;

const chosen = (record: RoleRecord): Chosen => ({
  choice: { role: record.base_role, role_id: record.is_system ? null : record.id },
  record,
});

/** A custom role fixes the base role: a different `role` beside it is a mismatch. */
function byId(roles: Roles, ask: { role_id: string; role?: UserRole | undefined }): Chosen {
  const record = roles.find((r) => r.id === ask.role_id);
  if (!record) return 'unknown_role';
  return ask.role !== undefined && ask.role !== record.base_role ? 'role_mismatch' : chosen(record);
}

/** A bare base role means that role's system role (role_id null). */
function byBase(roles: Roles, role: UserRole): Chosen {
  const record = roles.find((r) => r.is_system && r.base_role === role);
  return record ? { choice: { role, role_id: null }, record } : 'unknown_role';
}

/** What a request names, first match wins: a role_id, else a base role, else nothing. */
const roleRequest = z.union([
  z.object({ role_id: z.string().min(1), role: z.enum(USER_ROLES).optional() })
    .transform((ask) => (roles: Roles) => byId(roles, ask)),
  z.object({ role: z.enum(USER_ROLES) }).transform(({ role }) => (roles: Roles) => byBase(roles, role)),
  z.object({}).transform(() => (): Chosen => null),
]);

/**
 * The (base role, role_id) a request names: a custom role fixes the base role; a bare base role
 * means that role's system role (role_id null). null = the request does not name a role.
 */
export function chooseRole(
  roles: Roles,
  input: { role?: UserRole | undefined; role_id?: string | null | undefined },
): Chosen {
  return roleRequest.parse(input)(roles);
}

const PROFILE_KEYS = ['full_name', 'phone_e164', 'locale', 'tz'] as const satisfies readonly (keyof ProfilePatch)[];
type ProfileKey = (typeof PROFILE_KEYS)[number];

/** The `keys` of `input` that were sent: undefined = not sent, null is a value. */
export function sentOnly<T extends object, K extends keyof T>(
  input: T,
  keys: readonly K[],
): { [P in K]?: Exclude<T[P], undefined> } {
  const sent = keys.filter((k) => input[k] !== undefined).map((k) => [k, input[k]]);
  return Object.fromEntries(sent) as { [P in K]?: Exclude<T[P], undefined> };
}

/** The profile columns a PATCH names (only what was sent). */
export const profilePatch = (input: { [K in ProfileKey]?: ProfilePatch[K] | undefined }): ProfilePatch =>
  sentOnly(input, PROFILE_KEYS);

/** A base role change is refused when a teacher / student / guardian record is (or would be) involved. */
export const roleChangeBlocked = (ctx: { from: UserRole; to: UserRole; linked: boolean }): boolean =>
  ctx.from !== ctx.to && (ctx.linked || isLinkedRole(ctx.from) || isLinkedRole(ctx.to));
