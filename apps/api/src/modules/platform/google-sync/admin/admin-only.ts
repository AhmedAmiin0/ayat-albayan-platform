import { createParamDecorator, ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { isAdmin } from '@/common/auth/roles';

/**
 * Defence in depth on top of the settings.* permissions: the Google account is the academy's own,
 * so only a base-role admin may see or change its sync, even if a custom role holds the permission.
 */
export function requireAdmin(user: AuthUser): void {
  if (!isAdmin(user)) throw new ForbiddenException({ message: 'admin_only' });
}

/**
 * The signed-in admin. It throws while the arguments are read, before the body pipe settles, so a
 * non-admin still gets 403 rather than 400 for a bad body.
 */
export const AdminUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const { user } = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  requireAdmin(user);
  return user;
});
