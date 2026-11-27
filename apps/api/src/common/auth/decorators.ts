import type { Permission } from '@ab/catalog';
import {
  applyDecorators,
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthUser } from './verify-token';

export const IS_PUBLIC = 'isPublic';
export const SIGNED_IN = 'signedIn';
export const PERMISSION = 'permission';
/**
 * Set by @Public only, never by a route object's `isPublic`, so the coverage test can report a
 * handler made public from both sources.
 */
export const OWN_PUBLIC = 'ownPublic';

/** Skip authentication (health, webhooks with their own signature check). */
export const Public = () =>
  applyDecorators(SetMetadata(IS_PUBLIC, true), SetMetadata(OWN_PUBLIC, true));

/**
 * Any signed-in user, whatever their role or permissions (GET /auth/me, the sign-in/out log):
 * the client learns its permissions from /auth/me, so that route can never require one.
 */
export const SignedIn = () => SetMetadata(SIGNED_IN, true);

/**
 * The one permission a route needs (dynamic roles; defence in depth on top of RLS,
 * rule 9). On a class it is the default; a handler's own @Permissions overrides it. A route
 * object's `permissions` replace both, never beside them (permissions.coverage.test.ts).
 */
export const Permissions = (permission: Permission) => SetMetadata(PERMISSION, permission);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);
