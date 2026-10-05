import { WILDCARD, type RoleUpdateInput } from '@ab/shared';
import { ConflictException } from '@nestjs/common';
import type { RoleRow } from './roles.mapper';

function conflict(message: string, field?: string): ConflictException {
  return new ConflictException(field ? { message, field } : { message });
}

/**
 * What a PATCH may not do (409, never a silent ignore):
 *  - a system role keeps its key and base role, and cannot be deleted;
 *  - the admin system role always keeps '*';
 *  - a role that still has users keeps its base role (their profiles.role would disagree).
 */
function assertSystemUpdatable(role: RoleRow, patch: RoleUpdateInput): void {
  if (patch.key !== undefined && patch.key !== role.key) throw conflict('system_immutable', 'key');
  if (patch.base_role !== undefined && patch.base_role !== role.base_role) {
    throw conflict('system_immutable', 'base_role');
  }
  if (role.key === 'admin' && patch.permissions && !patch.permissions.includes(WILDCARD)) {
    throw conflict('admin_wildcard');
  }
}

export function assertUpdatable(role: RoleRow, patch: RoleUpdateInput, userCount: number): void {
  if (role.is_system) assertSystemUpdatable(role, patch);
  else if (patch.key !== undefined && patch.key !== role.key) throw conflict('key_immutable', 'key');
  if (patch.base_role !== undefined && patch.base_role !== role.base_role && userCount > 0) {
    throw new ConflictException({ message: 'role_has_users', count: userCount, field: 'base_role' });
  }
}

export function assertDeletable(role: RoleRow, userCount: number): void {
  if (role.is_system) throw conflict('system_immutable');
  if (userCount > 0) throw new ConflictException({ message: 'role_has_users', count: userCount });
}
