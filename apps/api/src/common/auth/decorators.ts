import type { Permission } from '@ab/shared';
import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './verify-token';

export const IS_PUBLIC = 'isPublic';
export const SIGNED_IN = 'signedIn';
export const PERMISSION = 'permission';

/** Skip authentication (health, webhooks with their own signature check). */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/**
 * Any signed-in user, whatever their role or permissions (GET /auth/me, the sign-in/out log):
 * the client learns its permissions from /auth/me, so that route can never require one.
 */
export const SignedIn = () => SetMetadata(SIGNED_IN, true);

/**
 * The one permission a route needs (dynamic roles, 2026-10-05; defence in depth on top of RLS,
 * rule 9). On a class it is the default; a handler's own @Permissions overrides it. Every
 * non-public route has exactly one (permissions.coverage.test.ts).
 */
export const Permissions = (permission: Permission) => SetMetadata(PERMISSION, permission);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
