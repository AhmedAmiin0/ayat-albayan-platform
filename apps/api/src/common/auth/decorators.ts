import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { Permission } from '@ab/shared';
import type { AuthUser, Role } from './verify-token';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';
export const REQUIRED_PERMISSION = 'requiredPermission';

/** Skip authentication (health, webhooks with their own signature check). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restrict a route to the given roles (defence in depth on top of RLS, rule 9). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

/**
 * Explicit permission for one route, checked for every caller (the wildcard always passes).
 * Admin routes need none: AuthGuard derives theirs from ROUTE_PERMISSIONS.
 */
export const RequirePermission = (permission: Permission) => SetMetadata(REQUIRED_PERMISSION, permission);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
