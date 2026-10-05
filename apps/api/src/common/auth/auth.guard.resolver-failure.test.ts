import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { AuthGuard } from './auth.guard';
import { PERMISSION, SIGNED_IN } from './decorators';
import type { PermissionResolver } from './permissions';
import type { AuthUser } from './verify-token';

// The permission lookup is a DB read: when it fails, GET /auth/me (SignedIn) must still answer a
// non-admin (no permissions), while an admin, and any permission-guarded route, fail loudly.

const failing: PermissionResolver = async () => {
  throw new Error('db down');
};

function guardFor(user: AuthUser, meta: Record<string, unknown>) {
  const reflector = { getAllAndOverride: (key: string) => meta[key] } as unknown as Reflector;
  const guard = new AuthGuard(reflector, async () => user, failing);
  const req: { headers: Record<string, string>; user?: AuthUser } = { headers: { authorization: 'Bearer t' } };
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { run: () => guard.canActivate(ctx), req };
}

describe('AuthGuard — permission lookup failure', () => {
  it('lets a non-admin through a signed-in route with no permissions', async () => {
    const { run, req } = guardFor({ id: 't1', email: null, role: 'teacher' }, { [SIGNED_IN]: true });
    await expect(run()).resolves.toBe(true);
    expect(req.user?.permissions).toEqual([]);
  });

  it('rethrows for an admin on a signed-in route', async () => {
    const { run } = guardFor({ id: 'a1', email: null, role: 'admin' }, { [SIGNED_IN]: true });
    await expect(run()).rejects.toThrow('db down');
  });

  it('rethrows on a permission-guarded route, whoever asks', async () => {
    const { run } = guardFor({ id: 't1', email: null, role: 'teacher' }, { [PERMISSION]: 'reports.read' });
    await expect(run()).rejects.toThrow('db down');
  });
});
