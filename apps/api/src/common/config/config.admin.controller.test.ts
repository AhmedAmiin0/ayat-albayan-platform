import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import type { AuthUser } from '../auth/verify-token';
import { SettingsService } from '../settings/settings.service';
import { SETTING_DEFAULTS } from '../settings/settings.values';
import { ConfigAdminQueries } from './config-admin.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const settings = { all: vi.fn(), write: vi.fn() };
const audit = { record: vi.fn() };
const queries = { meta: vi.fn() };

describe('new settings over PATCH /settings, and GET /config/meta', () => {
  let app: NestFastifyApplication;
  const call = (method: 'GET' | 'PATCH', url: string, opts: { token?: string; payload?: object } = {}) =>
    app.inject({ method, url, payload: opts.payload, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SettingsService).useValue(settings)
      .overrideProvider(AuditService).useValue(audit)
      .overrideProvider(ConfigAdminQueries).useValue(queries)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    settings.all.mockResolvedValue(SETTING_DEFAULTS);
  });

  it('PATCH writes a newer key under its row name and audits before/after', async () => {
    const after = { ...SETTING_DEFAULTS, activity_retention_days: 90 };
    settings.all.mockResolvedValueOnce(SETTING_DEFAULTS).mockResolvedValue(after);
    const res = await call('PATCH', '/settings', { payload: { activityRetentionDays: 90, recordingRetentionDays: null } });
    expect(res.statusCode).toBe(200);
    expect(settings.write).toHaveBeenCalledWith({ activity_retention_days: 90, recording_retention_days: null }, USERS['admin']?.id);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'settings', before: SETTING_DEFAULTS, after }));
  });

  it.each([{ activityRetentionDays: 0 }, { recordingRetentionDays: 0 }, { defaultLessonMinutes: 500 }, { academyContact: { whatsapp: '0566' } }])(
    'rejects %j with 400',
    async (payload) => {
      expect((await call('PATCH', '/settings', { payload })).statusCode).toBe(400);
      expect(settings.write).not.toHaveBeenCalled();
    },
  );

  it('GET /config/meta is admin only and returns who changed what', async () => {
    const meta = { activity_retention_days: { updatedAt: 'T', updatedBy: 'u', updatedByName: 'منى' } };
    queries.meta.mockResolvedValue(meta);
    expect((await call('GET', '/config/meta', { token: 'teacher' })).statusCode).toBe(403);
    expect((await call('GET', '/config/meta')).json()).toEqual({ meta });
  });
});
