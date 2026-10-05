import type { Permission } from '@ab/shared';
import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC, PERMISSION, SIGNED_IN } from './decorators';
import { PERMISSION_RESOLVER, type PermissionResolver } from './permissions';
import type { AuthUser } from './verify-token';

export { PERMISSION_RESOLVER, systemResolver } from './permissions';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
export type TokenVerifier = (token: string) => Promise<AuthUser>;

interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}

/**
 * Global guard (R-AUTH-01): verifies the Supabase JWT, resolves the user's permissions from their
 * role (PERMISSION_RESOLVER, cached) onto req.user, then enforces @Permissions(). @Public skips
 * everything; @SignedIn needs a valid token only. A route with neither and no permission is
 * refused (fail closed; the coverage test keeps that from happening).
 */
@Injectable()
export class AuthGuard implements CanActivate {
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
    const permissions = await this.resolve(user);
    req.user = { ...user, permissions };

    if (this.reflector.getAllAndOverride<boolean>(SIGNED_IN, targets)) return true;
    const needed = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION, targets);
    if (!needed || !permissions.includes(needed)) throw new ForbiddenException();
    return true;
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
