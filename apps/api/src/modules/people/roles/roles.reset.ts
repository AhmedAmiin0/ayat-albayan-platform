import { defaultGrantsOf, isEditableSystemRole, type Permission } from '@ab/shared';
import type { AuditEntry } from '../../../common/audit/audit.service';
import { isSystemAdmin, type RoleState } from './roles.logic';
import type { RoleRecord } from './roles.store';

// «استعادة الافتراضي» (owner 2026-10-12): the built-in teacher / sales / assistant roles go back to
// the grants they were seeded with; the system admin stays fixed and custom roles have no default.

export type ResetProblem = 'admin_role_fixed' | 'not_system_role';

/** The grants a reset writes, or why the role cannot be reset (both 400). */
export function resetGrants(role: RoleRecord): { ok: true; permissions: Permission[] } | { ok: false; code: ResetProblem } {
  if (isSystemAdmin(role)) return { ok: false, code: 'admin_role_fixed' };
  if (!role.is_system || !isEditableSystemRole(role.key)) return { ok: false, code: 'not_system_role' };
  return { ok: true, permissions: defaultGrantsOf(role.key) };
}

export type GrantAction = 'permissions_update' | 'permissions_reset';

/** One write of a role's grant set (PATCH /roles/:id with permissions, or a reset). */
export interface Regrant {
  state: RoleState;
  role: RoleRecord;
  permissions: Permission[];
  actorId: string;
  action: GrantAction;
}

/** The audit_log row of a grant change: before = the rows as stored, after = the rows written. */
export function regrantAudit(change: Regrant): AuditEntry {
  return {
    actorId: change.actorId,
    entity: 'roles',
    entityId: change.role.id,
    action: change.action,
    before: { permissions: [...change.role.permissions] },
    after: { permissions: [...change.permissions] },
  };
}
