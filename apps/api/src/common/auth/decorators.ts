import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AuthUser, Role } from './verify-token';

export const IS_PUBLIC = 'isPublic';
export const ROLES = 'roles';

/** Skip authentication (health, webhooks with their own signature check). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restrict a route to the given roles (defence in depth on top of RLS, rule 9). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
