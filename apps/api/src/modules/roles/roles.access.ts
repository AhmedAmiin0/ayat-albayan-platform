import { can, WILDCARD, type Permission } from '@ab/shared';
import { ForbiddenException } from '@nestjs/common';
import type { ResolvedAccess } from '../../common/auth/permission-resolver';
import type { RoleRow } from './roles.mapper';

/** The caller of a role change, as the PermissionResolver sees them. */
export type Actor = Pick<ResolvedAccess, 'roleKey' | 'permissions'>;

const forbid = (message: string, extra: object = {}): ForbiddenException => new ForbiddenException({ message, ...extra });

const isAdminRole = (role: RoleRow | null): boolean => role?.is_system === true && role.key === 'admin';

/**
 * Nobody hands out more than they hold (403, never a silent ignore):
 *  - '*' belongs to the admin system role alone; no other role may carry it;
 *  - every permission a change newly grants must be held by the caller (`can`: '*' holds all,
 *    manage holds view). `target` is null for a new role, whose `added` is all of `requested`.
 */
export function assertGrantable(input: {
  actor: Actor;
  target: RoleRow | null;
  requested: readonly Permission[];
  added: readonly Permission[];
}): void {
  if (input.requested.includes(WILDCARD) && !isAdminRole(input.target)) throw forbid('wildcard_reserved');
  const missing = input.added.filter((p) => !can(input.actor.permissions, p));
  if (missing.length > 0) throw forbid('permission_not_held', { permissions: missing });
}

/** Only a wildcard holder may edit the role they hold themselves (a role manager cannot self-promote). */
export function assertNotOwnRole(actor: Actor, role: RoleRow): void {
  if (actor.roleKey === role.key && !actor.permissions.has(WILDCARD)) throw forbid('own_role');
}
