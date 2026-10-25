import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';

/**
 * Defence in depth on top of @Permissions('settings.*'): the Google account is the academy's own,
 * so only a base-role admin may see or change its sync, even if a custom role holds the permission.
 */
export function requireAdmin(user: AuthUser): void {
  if (user.role !== 'admin') throw new ForbiddenException({ message: 'admin_only' });
}
