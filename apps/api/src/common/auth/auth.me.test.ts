import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.module';
import type { PermissionResolver } from './permission-resolver';
import type { AuthUser } from './verify-token';

const access = { roleKey: 'clerk', permissions: new Set(['b.view', 'a.view']), fullName: 'س', locale: 'ar', tz: 'Asia/Riyadh' };
const user = (role: AuthUser['role']): AuthUser => ({ id: 'u1', email: 'u@x.test', role });
const controller = (resolve: () => Promise<unknown>) => new AuthController({ resolve } as unknown as PermissionResolver);

afterEach(() => vi.restoreAllMocks());

describe('GET /auth/me', () => {
  it('returns the resolved role key and sorted permissions', async () => {
    const me = await controller(async () => access).me(user('admin'));
    expect(me).toMatchObject({ id: 'u1', role: 'admin', roleKey: 'clerk', fullName: 'س', permissions: ['a.view', 'b.view'] });
  });

  it('degrades to a plain user for a non-admin base role when the lookup fails, and logs it', async () => {
    const log = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const me = await controller(() => Promise.reject(new Error('db down'))).me(user('teacher'));
    expect(me).toMatchObject({ role: 'teacher', roleKey: null, permissions: [], fullName: null, locale: null, tz: null });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('db down'));
  });

  it('fails closed for an admin base role', async () => {
    await expect(controller(() => Promise.reject(new Error('db down'))).me(user('admin'))).rejects.toThrow('db down');
  });
});
