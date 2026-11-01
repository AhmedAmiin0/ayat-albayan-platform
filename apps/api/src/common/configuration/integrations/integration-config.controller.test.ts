import { INTEGRATION_KEYS } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { AuditService } from '@/common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { fakeQueries } from './integration-config.fakes';
import { IntegrationConfigRepo } from './integration-config.repo';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const q = fakeQueries();
const audit = { record: vi.fn() };
/** Every secret, in env AND in the (fake) Vault read: none may ever reach a response. */
const SENTINEL = (key: string) => `SENTINEL-${key}-value`;
const SECRET_KEYS = INTEGRATION_KEYS.filter((d) => d.secret).map((d) => d.key);

describe('/settings/integrations («التكاملات»)', () => {
  let app: NestFastifyApplication;
  const call = (o: { method: 'GET' | 'PUT' | 'DELETE'; url?: string; token?: string; payload?: object }) =>
    app.inject({ method: o.method, url: o.url ?? '/settings/integrations', payload: o.payload, headers: { authorization: `Bearer ${o.token ?? 'admin'}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(IntegrationConfigRepo).useValue(q)
      .overrideProvider(AuditService).useValue(audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    for (const k of SECRET_KEYS) vi.stubEnv(k, SENTINEL(k));
    q.rawValues.mockResolvedValue(Object.fromEntries(SECRET_KEYS.map((k) => [k, SENTINEL(k)])));
    q.plainRows.mockResolvedValue([{ key: 'WA_WABA_ID', value: 'db-waba', updated_at: '2026-10-12T08:00:00Z' }]);
    q.secretStatus.mockResolvedValue([{ key: 'WA_APP_SECRET', updated_at: '2026-10-12T08:00:00Z' }]);
  });

  const noSecretIn = (body: string) => SECRET_KEYS.forEach((k) => expect(body).not.toContain(SENTINEL(k)));

  it('admins read every key with its source; no secret value appears anywhere; teachers get 403', async () => {
    const res = await call({ method: 'GET' });
    expect(res.statusCode).toBe(200);
    noSecretIn(res.body);
    const items = res.json<{ key: string; value: string | null; source: string }[]>();
    expect(items.find((i) => i.key === 'WA_WABA_ID')).toMatchObject({ value: 'db-waba', source: 'db' });
    expect(items.find((i) => i.key === 'WA_APP_SECRET')).toMatchObject({ value: null, source: 'db', set: true });
    expect(items.find((i) => i.key === 'WA_ACCESS_TOKEN')).toMatchObject({ value: null, source: 'env', set: true });
    expect((await call({ method: 'GET', token: 'teacher' })).statusCode).toBe(403);
  });

  it('PUT writes the plain values (null clears) and audits key names only', async () => {
    const res = await call({ method: 'PUT', payload: { values: { WA_WABA_ID: ' w2 ', FX_API_URL: null } } });
    expect(res.statusCode).toBe(200);
    noSecretIn(res.body);
    expect(q.writePlain).toHaveBeenCalledWith({ WA_WABA_ID: 'w2', FX_API_URL: null }, USERS['admin']?.id);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'integration_config', action: 'update', after: { keys: ['WA_WABA_ID', 'FX_API_URL'] } }));
  });

  it('PUT refuses a bad value, a secret key or an unknown key with 400 naming the key; nothing is written', async () => {
    for (const values of [{ WA_API_BASE: 'nope' }, { WA_ACCESS_TOKEN: 'x' }, { PORT: '1' }]) {
      const res = await call({ method: 'PUT', payload: { values } });
      expect(res.statusCode).toBe(400);
      expect(res.body).toContain(`values.${Object.keys(values)[0]}`);
    }
    expect(q.writePlain).not.toHaveBeenCalled();
    expect((await call({ method: 'PUT', token: 'teacher', payload: { values: {} } })).statusCode).toBe(403);
  });

  it('PUT a secret: stored through the queries, never echoed or audited with its value', async () => {
    const res = await call({ method: 'PUT', url: '/settings/integrations/secrets/WA_APP_SECRET', payload: { value: 'SENTINEL-new-secret' } });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('SENTINEL-new-secret');
    expect(q.setSecret).toHaveBeenCalledWith({ key: 'WA_APP_SECRET', value: 'SENTINEL-new-secret' });
    expect(JSON.stringify(audit.record.mock.calls)).not.toContain('SENTINEL');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'secret_set:WA_APP_SECRET', after: { keys: ['WA_APP_SECRET'] } }));
  });

  it('a secret route refuses a plain or unknown key, and a blank value', async () => {
    expect((await call({ method: 'PUT', url: '/settings/integrations/secrets/WA_WABA_ID', payload: { value: 'x' } })).statusCode).toBe(400);
    expect((await call({ method: 'PUT', url: '/settings/integrations/secrets/SUPABASE_SERVICE_ROLE_KEY', payload: { value: 'x' } })).statusCode).toBe(400);
    expect((await call({ method: 'PUT', url: '/settings/integrations/secrets/WA_APP_SECRET', payload: { value: ' ' } })).statusCode).toBe(400);
    expect(q.setSecret).not.toHaveBeenCalled();
  });

  it('FEATURE_STRIPE=test: a live Stripe key is 400 and never stored, echoed or audited; live: it is stored', async () => {
    vi.stubEnv('FEATURE_STRIPE', 'test');
    const url = '/settings/integrations/secrets/STRIPE_API_KEY';
    for (const value of ['sk_live_51LiveAbc', 'rk_live_51LiveAbc', 'pk_test_51LiveAbc']) {
      const res = await call({ method: 'PUT', url, payload: { value } });
      expect([res.statusCode, res.json().issues[0].message]).toEqual([400, 'stripe_live_key_refused']);
      expect(res.body).not.toContain('LiveAbc');
    }
    expect(q.setSecret).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
    expect((await call({ method: 'PUT', url, payload: { value: ' rk_test_51Abc ' } })).statusCode).toBe(200);
    expect(q.setSecret).toHaveBeenCalledWith({ key: 'STRIPE_API_KEY', value: 'rk_test_51Abc' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'secret_set:STRIPE_API_KEY', after: { keys: ['STRIPE_API_KEY'] } }));
    const hook = await call({ method: 'PUT', url: '/settings/integrations/secrets/STRIPE_WEBHOOK_SECRET', payload: { value: 'abc' } });
    expect(hook.statusCode).toBe(400);
    vi.stubEnv('FEATURE_STRIPE', 'live');
    const live = await call({ method: 'PUT', url, payload: { value: 'sk_live_51LiveAbc' } });
    expect([live.statusCode, live.body.includes('LiveAbc')]).toEqual([200, false]);
    expect(q.setSecret).toHaveBeenLastCalledWith({ key: 'STRIPE_API_KEY', value: 'sk_live_51LiveAbc' });
    const junk = await call({ method: 'PUT', url, payload: { value: 'pk_live_51LiveAbc' } });
    expect([junk.statusCode, junk.json().issues[0].message]).toEqual([400, 'stripe_live_key_refused']);
  });

  it('without FEATURE_STRIPE no Stripe key is listed, stored or cleared: 400, nothing written', async () => {
    vi.stubEnv('FEATURE_STRIPE', '');
    const url = '/settings/integrations/secrets/STRIPE_API_KEY';
    expect((await call({ method: 'PUT', url, payload: { value: 'rk_test_51Abc' } })).statusCode).toBe(400);
    expect((await call({ method: 'DELETE', url })).statusCode).toBe(400);
    const put = await call({ method: 'PUT', payload: { values: { STRIPE_ENABLED: 'true' } } });
    expect([put.statusCode, put.body.includes('values.STRIPE_ENABLED')]).toEqual([400, true]);
    const listed = (await call({ method: 'GET' })).json<{ group: string }[]>();
    expect(listed.filter((i) => i.group === 'stripe')).toEqual([]);
    for (const fn of [q.setSecret, q.clearSecret, q.writePlain, audit.record]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('DELETE a secret clears it (env applies again) and audits the key', async () => {
    const res = await call({ method: 'DELETE', url: '/settings/integrations/secrets/LIVEKIT_API_SECRET' });
    expect(res.statusCode).toBe(200);
    noSecretIn(res.body);
    expect(q.clearSecret).toHaveBeenCalledWith('LIVEKIT_API_SECRET');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'secret_clear:LIVEKIT_API_SECRET' }));
    expect((await call({ method: 'DELETE', token: 'teacher', url: '/settings/integrations/secrets/LIVEKIT_API_SECRET' })).statusCode).toBe(403);
  });
});
