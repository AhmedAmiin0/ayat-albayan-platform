import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../../common/auth/auth.guard';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { StaffPhotoAdmin } from '../../../../common/storage/avatars/staff-photo-admin';
import { FakeRoleStore } from '../../roles/roles.fakes';
import { ROLE_STORE } from '../../roles/roles.store';
import { FakeAuthAdmin, FakeUserStore, row } from '../users.fakes';
import { AUTH_ADMIN, USER_STORE } from '../store/users.store';

// The admin's staff-photo routes through the real guards (owner 2026-10-28).

const USERS: Record<string, AuthUser> = {
  admin: { id: 'admin1', email: null, role: 'admin' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  sales: { id: 'sales1', email: null, role: 'sales' },
};
const verify: TokenVerifier = async (token) => {
  const found = USERS[token];
  if (!found) throw new Error('bad token');
  return found;
};
const TEACHER = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
const USER = '7a2d3c9f-1e1b-4d9f-8b62-3b7c1f7e0f22';
const photos = { uploadUrl: vi.fn(), set: vi.fn(), remove: vi.fn() };

describe('staff photo routes', () => {
  let app: NestFastifyApplication;
  const call = (method: 'POST' | 'PUT' | 'DELETE', url: string, opts: { token?: string; payload?: object } = {}) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` }, ...(opts.payload && { payload: opts.payload }) });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(USER_STORE).useValue(new FakeUserStore([row('admin1', 'admin'), row(USER, 'sales')]))
      .overrideProvider(AUTH_ADMIN).useValue(new FakeAuthAdmin())
      .overrideProvider(ROLE_STORE).useValue(new FakeRoleStore())
      .overrideProvider(StaffPhotoAdmin).useValue(photos)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    photos.uploadUrl.mockResolvedValue({ bucket: 'avatars', path: `teachers/${TEACHER}/avatar-1.png`, token: 't', signed_url: 'https://s' });
    photos.set.mockResolvedValue({ avatar_url: 'https://storage.test/p' });
    photos.remove.mockResolvedValue({ avatar_url: null });
  });

  it('an admin uploads, registers and removes a teacher’s photo (no login needed)', async () => {
    const up = await call('POST', `/teachers/${TEACHER}/avatar/upload-url`, { payload: { mime: 'image/png', size: 900 } });
    expect(up.statusCode).toBe(201);
    expect(photos.uploadUrl).toHaveBeenCalledWith({ kind: 'teacher', id: TEACHER }, { mime: 'image/png', size: 900 });
    const set = await call('PUT', `/teachers/${TEACHER}/avatar`, { payload: { path: `teachers/${TEACHER}/avatar-1.png` } });
    expect([set.statusCode, set.json()]).toEqual([200, { avatar_url: 'https://storage.test/p' }]);
    expect(photos.set).toHaveBeenCalledWith({ kind: 'teacher', id: TEACHER }, { path: `teachers/${TEACHER}/avatar-1.png`, actorId: 'admin1' });
    const del = await call('DELETE', `/teachers/${TEACHER}/avatar`);
    expect([del.statusCode, del.json()]).toEqual([200, { avatar_url: null }]);
  });

  it('an admin sets and removes a user’s photo', async () => {
    expect((await call('POST', `/users/${USER}/avatar/upload-url`, { payload: { mime: 'image/webp', size: 10 } })).statusCode).toBe(201);
    expect((await call('PUT', `/users/${USER}/avatar`, { payload: { path: `${USER}/avatar-1.webp` } })).statusCode).toBe(200);
    expect((await call('DELETE', `/users/${USER}/avatar`)).statusCode).toBe(200);
    expect(photos.remove).toHaveBeenCalledWith({ kind: 'user', id: USER }, 'admin1');
  });

  it('refuses a bad type or size before any Storage call', async () => {
    const res = await call('POST', `/teachers/${TEACHER}/avatar/upload-url`, { payload: { mime: 'image/gif', size: 10 } });
    expect(res.statusCode).toBe(400);
    expect(photos.uploadUrl).not.toHaveBeenCalled();
  });

  it.each(['teacher', 'sales'])('403 for a %s, nothing called', async (token) => {
    for (const url of [`/teachers/${TEACHER}/avatar`, `/users/${USER}/avatar`]) {
      expect((await call('DELETE', url, { token })).statusCode).toBe(403);
      expect((await call('PUT', url, { token, payload: { path: 'x/avatar-1.png' } })).statusCode).toBe(403);
    }
    expect(photos.set).not.toHaveBeenCalled();
    expect(photos.remove).not.toHaveBeenCalled();
  });
});
