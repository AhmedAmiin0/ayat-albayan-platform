import type { Permission } from '@ab/catalog';
import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC, PERMISSION, SIGNED_IN } from './decorators';
import { forbidden } from '@/common/http/errors';
import { AccountDisabledError, PERMISSION_RESOLVER, type PermissionResolver } from './permissions';
import type { AuthUser } from './verify-token';
import { isAdmin } from '@/common/auth/roles';

export { PERMISSION_RESOLVER, systemResolver } from './permissions';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
export type TokenVerifier = (token: string) => Promise<AuthUser>;

/** One key (@Permissions) or the list of a route object, of which any one lets a caller in. */
type NeededPermission = Permission | readonly Permission[] | undefined;

/** No metadata, or an empty list, admits nobody. */
const holdsAnyOf = (held: readonly Permission[], needed: NeededPermission): boolean =>
  [needed ?? []].flat().some((key) => held.includes(key));

interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}

/**
 * Global guard (R-AUTH-01): verifies the Supabase JWT, resolves the user's permissions from their
 * role (PERMISSION_RESOLVER, cached) onto req.user, then enforces the route's permissions: its
 * own list (any one key lets a caller in) or the single key of @Permissions(). @Public skips
 * everything; @SignedIn needs a valid token only. A route with neither and no permission is
 * refused (fail closed; the coverage test keeps that from happening). isTest: profiles.is_test
 * (the resolver's, false on any doubt), for the four checks a test account may skip (docs/56).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly log = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verify: TokenVerifier,
    @Inject(PERMISSION_RESOLVER) private readonly resolve: PermissionResolver,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const user = await this.authenticate(req.headers['authorization']);
    const signedIn = this.reflector.getAllAndOverride<boolean>(SIGNED_IN, targets);
    const permissions = await this.permissionsOf(user, signedIn);
    req.user = { ...user, permissions, isTest: await this.isTest(user) };

    if (signedIn) return true;
    const needed = this.reflector.getAllAndOverride<NeededPermission>(PERMISSION, targets);
    if (!holdsAnyOf(permissions, needed)) throw new ForbiddenException();
    return true;
  }

  /**
   * A resolver failure (DB down) must not lock a non-admin out of GET /auth/me: they sign in with
   * no permissions. An admin's failure is rethrown, so the console never shows an empty admin.
   */
  private async permissionsOf(user: AuthUser, signedIn: boolean): Promise<readonly Permission[]> {
    try {
      return await this.resolve(user);
    } catch (e) {
      if (e instanceof AccountDisabledError) throw forbidden('account_disabled');
      if (!signedIn || isAdmin(user)) throw e;
      this.log.warn(`permissions unavailable for ${user.id}: ${e instanceof Error ? e.message : 'unknown'}`);
      return [];
    }
  }

  /** profiles.is_test (the resolver's, cached, false on any doubt); none wired (tests) = false. */
  private async isTest(user: AuthUser): Promise<boolean> {
    return (await this.resolve.isTest?.(user)) ?? false;
  }

  private async authenticate(header: string | string[] | undefined): Promise<AuthUser> {
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
    if (!token) throw new UnauthorizedException();
    try {
      return await this.verify(token);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
