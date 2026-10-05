import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@ab/shared';
import { IS_PUBLIC, REQUIRED_PERMISSION, ROLES } from './decorators';
import { decide } from './permission-check';
import { PermissionResolver } from './permission-resolver';
import type { AuthUser, Role } from './verify-token';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
export type TokenVerifier = (token: string) => Promise<AuthUser>;

interface AuthRequest {
  method: string;
  url: string;
  routeOptions?: { url?: string };
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}

/** Global guard: verifies the Supabase JWT, enforces @Roles(), then the caller's permissions. R-AUTH-01. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verify: TokenVerifier,
    private readonly permissions: PermissionResolver,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const user = await this.authenticate(req.headers['authorization']);
    req.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.some((r) => r === user.role)) throw new ForbiddenException();
    const explicit = this.reflector.getAllAndOverride<Permission | undefined>(REQUIRED_PERMISSION, targets);
    await this.checkPermission(req, user, { roles, explicit });
    return true;
  }

  /**
   * Permissions apply to admin-base callers on every route that admits admins, and to anyone on a
   * route with an explicit @RequirePermission. Teacher/assistant/sales/guardian callers keep their
   * base-role access on the routes @Roles gives them (RLS and the app section stay base-role based).
   */
  private async checkPermission(
    req: AuthRequest,
    user: AuthUser,
    rule: { roles: Role[] | undefined; explicit: Permission | undefined },
  ): Promise<void> {
    const adminRoute = user.role === 'admin' && rule.roles?.includes('admin') === true;
    if (!adminRoute && !rule.explicit) return;
    const { permissions } = await this.permissions.resolve(user.id);
    const path = req.routeOptions?.url ?? req.url.split('?')[0] ?? '';
    const verdict = decide(permissions, rule.explicit, { method: req.method, path });
    if (!verdict.ok) throw new ForbiddenException({ message: 'missing_permission', permission: verdict.permission });
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
