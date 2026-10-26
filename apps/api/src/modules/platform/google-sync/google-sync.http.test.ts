import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { AuditService } from '../../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { PermissionResolver } from '../../../common/auth/permissions';
import type { AuthUser } from '../../../common/auth/verify-token';
import { GoogleAccountQueries } from './oauth/google-account.queries';
import { fakeFactory } from './http/google-client.fake';
import { GOOGLE_CLIENT_FACTORY } from './google-client.port';
import { GoogleItemsQueries } from './sync/google-items.queries';
import { GoogleLogQueries } from './admin/google-log.queries';
import { GoogleMapQueries } from './map/google-map.queries';
import { GoogleSettings } from './google-settings';
import { fakeData } from './google-sync.fakes';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'a0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
  custom: { id: 'a0000000-0000-4000-8000-000000000003', email: null, role: 'sales' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
/** A custom role that was handed settings.* still is not the academy's admin. */
const resolver: PermissionResolver = async (u) => (u.role === 'sales' ? ['settings.read', 'settings.write'] : systemResolver(u));

const data = fakeData();
const map = { teachers: vi.fn().mockResolvedValue([]), mappedCalendarNames: vi.fn().mockResolvedValue([]), students: vi.fn().mockResolvedValue([]), student: vi.fn() };
const log = { recent: vi.fn().mockResolvedValue([]), one: vi.fn() };

const ROUTES = [
  ['GET', '/admin/google/status'], ['GET', '/admin/google/connect'], ['POST', '/admin/google/disconnect'], ['PUT', '/admin/google/settings'],
  ['POST', '/admin/google/discover'], ['PUT', '/admin/google/drive'], ['GET', '/admin/google/teachers'], ['GET', '/admin/google/students'],
  ['GET', '/admin/google/items'], ['POST', '/admin/google/reconcile'],
] as const;

describe('/admin/google (docs/24): admins only', () => {
  let app: NestFastifyApplication;
  const call = (o: { method: string; url: string; token?: string; payload?: object }) =>
    app.inject({ method: o.method as 'GET', url: o.url, payload: o.payload, headers: o.token ? { authorization: `Bearer ${o.token}` } : {} });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(GoogleAccountQueries).useValue(data.account).overrideProvider(GoogleItemsQueries).useValue(data.items)
      .overrideProvider(GoogleSettings).useValue(data.settings).overrideProvider(GoogleMapQueries).useValue(map)
      .overrideProvider(GoogleLogQueries).useValue(log).overrideProvider(AuditService).useValue({ record: vi.fn() })
      .overrideProvider(GOOGLE_CLIENT_FACTORY).useValue(fakeFactory())
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    data.items.counts.mockResolvedValue({ counts: { pending: 0, synced: 0, gone: 0, failed: 0, skipped: 0 }, skips: {} });
    data.account.get.mockResolvedValue({ status: 'disconnected', email: null, scopes: [], connected_at: null, last_error: null, discovery: null, root_folder_id: null, root_folder_name: null, summary_sheet_id: null, drive_confirmed_at: null, last_run_at: null });
  });

  it('401 without a token, 403 for a teacher and for a custom role holding settings.*', async () => {
    for (const [method, url] of ROUTES) {
      expect((await call({ method, url })).statusCode).toBe(401);
      expect((await call({ method, url, token: 'teacher' })).statusCode).toBe(403);
      expect((await call({ method, url, token: 'custom' })).statusCode).toBe(403);
    }
  });

  it('an admin reads the status: default OFF and dry_run, the redirect URI, never a token', async () => {
    data.account.token.mockResolvedValue('SENTINEL-refresh-token');
    const res = await call({ method: 'GET', url: '/admin/google/status', token: 'admin' });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ settings: object; redirect_uri: string; configured: boolean }>();
    expect(body.settings).toEqual({ enabled: true, mode: 'live', window_days: 60 });
    expect(body.redirect_uri).toMatch(/\/integrations\/google\/callback$/);
    expect(body.configured).toBe(false);
    expect(res.body).not.toContain('SENTINEL');
  });

  it('refuses a bad settings body (400) and connect without an OAuth client (409)', async () => {
    expect((await call({ method: 'PUT', url: '/admin/google/settings', token: 'admin', payload: { mode: 'write' } })).statusCode).toBe(400);
    expect((await call({ method: 'GET', url: '/admin/google/connect', token: 'admin' })).statusCode).toBe(409);
    expect(data.settings.write).not.toHaveBeenCalled();
  });

  it('the public callback always redirects to the settings page; a forged state never connects', async () => {
    const res = await call({ method: 'GET', url: '/integrations/google/callback?code=x&state=forged' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch(/\/admin\/settings\?google=error&reason=state#integrations$/);
    expect(data.account.setToken).not.toHaveBeenCalled();
    const denied = await call({ method: 'GET', url: '/integrations/google/callback?error=access_denied' });
    expect(denied.headers.location).toContain('reason=denied');
  });
});
