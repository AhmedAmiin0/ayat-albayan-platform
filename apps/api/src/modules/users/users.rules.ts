import type { LinkKind, Permission, UserRole } from '@ab/shared';
import { isSystemAdmin, roleView } from '../roles/roles.logic';
import type { RoleRecord } from '../roles/roles.store';
import { forbidden } from '../../common/http/errors';
import { assertOutranks, isSystemAdminProfile, missingFor, type UserState } from './users.logic';
import type { StaffProfile } from './users.store';

// Who may touch whom (review of the users-control PR, M2-M4). The actor's own profile comes from the
// DB state, not from the JWT claim, so a demotion applies at once.

export interface Actor {
  id: string;
  permissions: readonly Permission[];
}

/**
 * users.write alone must not reach the record behind a login: a teacher / student / guardian login
 * needs the matching write permission of its table too (create, reset, sign-out, disable, enable,
 * update, delete, and the link pickers).
 */
const RECORD_WRITE: Partial<Record<UserRole, Permission>> = {
  teacher: 'teachers.write',
  student: 'students.write',
  guardian: 'guardians.write',
};

interface Refusal {
  code: string;
  details?: Record<string, unknown>;
}

const lacking = (permission: Permission): Refusal => ({ code: 'permission_not_held', details: { permission } });
const myProfile = (state: UserState, actor: Actor): StaffProfile | undefined => state.profiles.find((p) => p.id === actor.id);
const isSystemAdminActor = (state: UserState, actor: Actor): boolean => {
  const me = myProfile(state, actor);
  return me !== undefined && isSystemAdminProfile(state, me);
};

function recordRefusal(actor: Actor, role: UserRole): Refusal | null {
  const need = RECORD_WRITE[role];
  return need && !actor.permissions.includes(need) ? lacking(need) : null;
}

/**
 * Why the actor may not give a login `role` (create, or a role change); null = may. Admin-base roles
 * (custom ones too) need an admin actor; the system admin role needs a system admin; then the usual
 * "no role beyond your own grants".
 */
export function assignRefusal(actor: Actor, state: UserState, role: RoleRecord): Refusal | null {
  if (role.base_role === 'admin' && myProfile(state, actor)?.role !== 'admin') return { code: 'admin_role_only' };
  if (isSystemAdmin(role) && !isSystemAdminActor(state, actor)) return { code: 'system_admin_only' };
  const gap = missingFor(actor.permissions, roleView(state, role).permissions);
  return recordRefusal(actor, role.base_role) ?? (gap ? lacking(gap) : null);
}

export function assertMayAssign(actor: Actor, state: UserState, role: RoleRecord): void {
  const refusal = assignRefusal(actor, state, role);
  if (refusal) throw forbidden(refusal.code, refusal.details);
}

export const canAssign = (actor: Actor, state: UserState, role: RoleRecord): boolean => assignRefusal(actor, state, role) === null;

/** 403 unless the actor may change this existing login: only a system admin touches a system admin. */
export function assertMayTouch(actor: Actor, state: UserState, target: StaffProfile): void {
  if (isSystemAdminProfile(state, target) && !isSystemAdminActor(state, actor)) throw forbidden('system_admin_only');
  const refusal = recordRefusal(actor, target.role);
  if (refusal) throw forbidden(refusal.code, refusal.details);
  assertOutranks(actor.permissions, state, target);
}

/** 403 unless the actor holds the write permission of the table whose records the picker lists. */
export function assertMayList(actor: Actor, kind: LinkKind): void {
  const refusal = recordRefusal(actor, kind);
  if (refusal) throw forbidden(refusal.code, refusal.details);
}
