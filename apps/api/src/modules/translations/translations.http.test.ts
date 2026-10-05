import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { ActivityWriter } from '../../common/activity/activity.writer';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { TranslationsQueries } from './translations.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const queries = { all: vi.fn(), upsert: vi.fn(), remove: vi.fn() };
const activity = { push: vi.fn(), flush: vi.fn(async () => undefined) };

describe('/i18n — dynamic translations', () => {
  let app: NestFastifyApplication;
  type Method = 'GET' | 'PUT' | 'DELETE';
  const call = (method: Method, url: string, opts: { token?: string; payload?: object; etag?: string } = {}) =>
    app.inject({
      method,
      url,
      payload: opts.payload,
      headers: {
        ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
        ...(opts.etag ? { 'if-none-match': opts.etag } : {}),
      },
    });

  beforeAll(async () => {
    queries.all.mockResolvedValue([]);
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(TranslationsQueries).useValue(queries)
      .overrideProvider(ActivityWriter).useValue(activity)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    queries.all.mockResolvedValue([{ key: 'nav.leads', locale: 'ar', value: 'قائمة العملاء' }]);
  });

  it('GET overrides is public, cached 60 s, and answers 304 to a matching ETag', async () => {
    await call('PUT', '/i18n/ar/nav.leads', { token: 'admin', payload: { value: 'قائمة العملاء' } });
    const res = await call('GET', '/i18n/ar/overrides');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ 'nav.leads': 'قائمة العملاء' });
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    const etag = String(res.headers['etag']);
    const again = await call('GET', '/i18n/ar/overrides', { etag });
    expect(again.statusCode).toBe(304);
    expect(again.body).toBe('');
    expect((await call('GET', '/i18n/fr/overrides')).statusCode).toBe(400);
  });

  it('GET keys is admin only and paginated', async () => {
    expect((await call('GET', '/i18n/keys')).statusCode).toBe(401);
    expect((await call('GET', '/i18n/keys', { token: 'teacher' })).statusCode).toBe(403);
    const res = await call('GET', '/i18n/keys?section=nav&search=leads&page=1', { token: 'admin' });
    expect(res.statusCode).toBe(200);
    expect(res.json().items.map((r: { key: string }) => r.key)).toContain('nav.leads');
  });

  it('PUT writes a valid override with the admin as author', async () => {
    const res = await call('PUT', '/i18n/en/nav.leads', { token: 'admin', payload: { value: 'Prospects' } });
    expect(res.statusCode).toBe(204);
    expect(queries.upsert).toHaveBeenCalledWith({ locale: 'en', key: 'nav.leads', value: 'Prospects', actorId: USERS['admin']?.id });
    expect(activity.push).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'translations.save', method: 'PUT', route: '/i18n/:locale/:key' }),
    );
  });

  it('PUT rejects unknown keys (404), dropped placeholders (400), empty values (400), non-admins (403)', async () => {
    expect((await call('PUT', '/i18n/en/nav.nope', { token: 'admin', payload: { value: 'x' } })).statusCode).toBe(404);
    const slots = await call('PUT', '/i18n/en/translations.count', { token: 'admin', payload: { value: 'Total' } });
    expect(slots.statusCode).toBe(400);
    expect(slots.json()).toMatchObject({ message: 'placeholders_missing', missing: ['{n}'] });
    expect((await call('PUT', '/i18n/en/nav.leads', { token: 'admin', payload: { value: '  ' } })).statusCode).toBe(400);
    expect((await call('PUT', '/i18n/en/nav.leads', { token: 'teacher', payload: { value: 'x' } })).statusCode).toBe(403);
    expect(queries.upsert).not.toHaveBeenCalled();
  });

  it('DELETE restores the default', async () => {
    expect((await call('DELETE', '/i18n/ar/nav.leads', { token: 'admin' })).statusCode).toBe(204);
    expect(queries.remove).toHaveBeenCalledWith('ar', 'nav.leads');
    expect((await call('DELETE', '/i18n/ar/nav.leads')).statusCode).toBe(401);
  });
});
