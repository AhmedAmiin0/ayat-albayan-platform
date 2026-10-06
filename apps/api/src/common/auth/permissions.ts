import { systemPermissionsOf, type Permission } from '@ab/shared';
import type { AuthUser } from './verify-token';

/** The user's profile is disabled: the guard answers 403 account_disabled, even with a valid JWT. */
export class AccountDisabledError extends Error {
  constructor() {
    super('account_disabled');
  }
}

/** The AuthGuard's source of a user's effective permission set (DB-backed in the app). */
export const PERMISSION_RESOLVER = Symbol('PERMISSION_RESOLVER');
export type PermissionResolver = (user: AuthUser) => Promise<readonly Permission[]>;

/**
 * The five system roles as seeded, without a DB: what tests that boot AppModule plug in with
 * `.overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)`.
 */
export const systemResolver: PermissionResolver = async (user) => (user.role ? systemPermissionsOf(user.role) : []);

/**
 * May this signed-in user do `permission`? For the inline checks that are about permission
 * (e.g. "sees every template"), never for scope (own lessons, own students: those stay on role).
 */
export function can(user: AuthUser, permission: Permission): boolean {
  return user.permissions?.includes(permission) ?? false;
}
