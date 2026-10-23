import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../audit/audit.service';
import { SINGLETON_ENTITY_ID } from '../audit/singleton-entity';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import type { AuthUser } from '../auth/verify-token';
import { CustomConfigService } from './custom-config.service';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const custom = { list: vi.fn(), find: vi.fn(), upsert: vi.fn(), remove: vi.fn() };
const audit = { record: vi.fn() };
const VIEW = { key: 'promo', value: 'hi', description: null, isPublic: true, updatedAt: '2026-10-05T00:00:00Z', updatedBy: null };

describe('/config/custom (admin CRUD)', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'PUT' | 'DELETE', url = '/config/custom', opts: { token?: string; payload?: object } = {}) =>
    app.inject({ method, url, payload: opts.payload, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(CustomConfigService).useValue(custom)
      .overrideProvider(AuditService).useValue(audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    custom.find.mockResolvedValue(null);
    custom.upsert.mockResolvedValue(VIEW);
  });

  it('is admin only, and never public', async () => {
    expect((await call('GET', '/config/custom', { token: 'teacher' })).statusCode).toBe(403);
    expect((await app.inject({ method: 'GET', url: '/config/custom' })).statusCode).toBe(401);
  });

  it('PUT creates an entry and audits it as a create', async () => {
    const res = await call('PUT', '/config/custom/promo', { payload: { value: 'hi', isPublic: true } });
    expect(res.statusCode).toBe(200);
    expect(custom.upsert).toHaveBeenCalledWith('promo', { value: 'hi', isPublic: true }, USERS['admin']?.id);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'custom_config', entityId: SINGLETON_ENTITY_ID, action: 'create:promo', before: null, after: VIEW }));
  });

  it('PUT over an existing entry audits before and after as an update', async () => {
    custom.find.mockResolvedValue({ ...VIEW, value: 'old' });
    await call('PUT', '/config/custom/promo', { payload: { value: 'hi' } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'update:promo', before: { ...VIEW, value: 'old' }, after: VIEW }));
  });

  it.each([
    ['a bad key', '/config/custom/Bad-Key', { value: 1 }],
    ['a registry key', '/config/custom/messaging_enabled', { value: 1 }],
    ['a null value', '/config/custom/promo', { value: null }],
    ['a value over 8 KB', '/config/custom/promo', { value: 'x'.repeat(9000) }],
    ['no value', '/config/custom/promo', {}],
  ])('rejects %s with 400 and writes nothing', async (_n, url, body) => {
    expect((await call('PUT', url, { payload: body })).statusCode).toBe(400);
    expect(custom.upsert).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('DELETE removes and audits; an unknown key is 404 and unaudited', async () => {
    custom.find.mockResolvedValue(VIEW);
    custom.remove.mockResolvedValue(true);
    expect((await call('DELETE', '/config/custom/promo')).statusCode).toBe(204);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'delete:promo', before: VIEW, after: null }));
    audit.record.mockClear();
    custom.find.mockResolvedValue(null);
    expect((await call('DELETE', '/config/custom/promo')).statusCode).toBe(404);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
