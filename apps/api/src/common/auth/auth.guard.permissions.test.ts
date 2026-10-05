import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthGuard } from './auth.guard';
import { REQUIRED_PERMISSION, ROLES } from './decorators';
import type { PermissionResolver, ResolvedAccess } from './permission-resolver';
import type { AuthUser, Role } from './verify-token';

const access = (...perms: string[]): ResolvedAccess => ({
  roleKey: 'x',
  permissions: new Set(perms),
  fullName: null,
  locale: null,
  tz: null,
});

interface Setup {
  roles?: Role[];
  explicit?: string;
  user?: Partial<AuthUser>;
  perms: string[];
  method?: string;
  url?: string;
}

function run(s: Setup) {
  const resolve = vi.fn(async () => access(...s.perms));
  const verify = async (): Promise<AuthUser> => ({ id: 'u1', email: null, role: 'admin', ...s.user });
  const meta: Record<string, unknown> = { [ROLES]: s.roles, [REQUIRED_PERMISSION]: s.explicit };
  const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
  const guard = new AuthGuard(reflector, verify, { resolve } as unknown as PermissionResolver);
  const req = { method: s.method ?? 'GET', url: s.url ?? '/students?page=1', headers: { authorization: 'Bearer t' } };
  const ctx = {
    getHandler: () => () => null,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { allowed: guard.canActivate(ctx), resolve };
}

describe('AuthGuard permissions', () => {
  it('wildcard admin passes mapped and unmapped admin routes', async () => {
    await expect(run({ roles: ['admin'], perms: ['*'] }).allowed).resolves.toBe(true);
    await expect(run({ roles: ['admin'], perms: ['*'], url: '/brand-new' }).allowed).resolves.toBe(true);
  });

  it('a custom admin role passes only what its permissions allow', async () => {
    await expect(run({ roles: ['admin'], perms: ['students.view'] }).allowed).resolves.toBe(true);
    await expect(run({ roles: ['admin'], perms: ['students.view'], method: 'POST' }).allowed).rejects.toThrow(
      ForbiddenException,
    );
    await expect(run({ roles: ['admin'], perms: ['payments.view'] }).allowed).rejects.toThrow(ForbiddenException);
  });

  it('the 403 names the missing permission', async () => {
    const err = await run({ roles: ['admin'], perms: [], method: 'DELETE', url: '/students/1' }).allowed.catch(
      (e: ForbiddenException) => e,
    );
    expect((err as ForbiddenException).getResponse()).toEqual({
      message: 'missing_permission',
      permission: 'students.manage',
    });
  });

  it('denies an unmapped admin route to a non-wildcard role', async () => {
    await expect(run({ roles: ['admin'], perms: ['students.manage'], url: '/brand-new' }).allowed).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('applies to routes shared with other roles when the caller is an admin-base user', async () => {
    await expect(run({ roles: ['admin', 'teacher'], perms: [], url: '/reports/1' }).allowed).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('leaves teacher-base callers on their base-role access (no permission lookup)', async () => {
    const r = run({ roles: ['admin', 'teacher'], user: { role: 'teacher' }, perms: [], url: '/reports/1' });
    await expect(r.allowed).resolves.toBe(true);
    expect(r.resolve).not.toHaveBeenCalled();
  });

  it('does not touch routes without @Roles', async () => {
    const r = run({ perms: [], url: '/auth/me' });
    await expect(r.allowed).resolves.toBe(true);
    expect(r.resolve).not.toHaveBeenCalled();
  });

  it('exempts self-service routes for any admin-base role', async () => {
    await expect(run({ roles: ['admin'], perms: [], method: 'PUT', url: '/me/push-tokens' }).allowed).resolves.toBe(true);
  });

  it('@RequirePermission is checked for every caller, wildcard included as a pass', async () => {
    await expect(run({ explicit: 'roles.manage', perms: ['roles.manage'], user: { role: 'teacher' } }).allowed).resolves.toBe(true);
    await expect(run({ explicit: 'roles.manage', perms: ['roles.view'] }).allowed).rejects.toThrow(ForbiddenException);
    await expect(run({ explicit: 'roles.manage', perms: ['*'] }).allowed).resolves.toBe(true);
  });

  it('still rejects a wrong base role before any permission lookup', async () => {
    const r = run({ roles: ['admin'], user: { role: 'guardian' }, perms: ['*'] });
    await expect(r.allowed).rejects.toThrow(ForbiddenException);
    expect(r.resolve).not.toHaveBeenCalled();
  });
});
