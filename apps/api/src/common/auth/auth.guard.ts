import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC, ROLES } from './decorators';
import type { AuthUser, Role } from './verify-token';

export const TOKEN_VERIFIER = Symbol('TOKEN_VERIFIER');
export type TokenVerifier = (token: string) => Promise<AuthUser>;

interface AuthRequest {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthUser;
}

/** Global guard: verifies the Supabase JWT, then enforces @Roles(). R-AUTH-01. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TOKEN_VERIFIER) private readonly verify: TokenVerifier,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    req.user = await this.authenticate(req.headers['authorization']);

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, targets);
    if (roles && !roles.some((r) => r === req.user?.role)) throw new ForbiddenException();
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
