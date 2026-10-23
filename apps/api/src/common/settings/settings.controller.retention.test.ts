import { SETTING_DEFAULTS } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../auth/auth.guard';
import type { AuthUser } from '../auth/verify-token';
import { SettingsService } from './settings.service';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};
const settings = { all: vi.fn(), write: vi.fn() };
const audit = { record: vi.fn() };

describe('PATCH /settings: retention days and the academy contact', () => {
  let app: NestFastifyApplication;
  const patch = (payload: object) =>
    app.inject({ method: 'PATCH', url: '/settings', payload, headers: { authorization: 'Bearer admin' } });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver)
      .overrideProvider(SettingsService).useValue(settings)
      .overrideProvider(AuditService).useValue(audit)
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

  it('writes a newer key under its row name and audits before/after', async () => {
    const after = { ...SETTING_DEFAULTS, activity_retention_days: 90 };
    settings.all.mockResolvedValueOnce(SETTING_DEFAULTS).mockResolvedValue(after);
    const res = await patch({ activityRetentionDays: 90, recordingRetentionDays: null });
    expect(res.statusCode).toBe(200);
    expect(settings.write).toHaveBeenCalledWith({ activity_retention_days: 90, recording_retention_days: null }, USERS['admin']?.id);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entity: 'settings', before: SETTING_DEFAULTS, after }));
  });

  it.each([{ activityRetentionDays: 0 }, { recordingRetentionDays: 0 }, { academyContact: { site: 'not a host' } }, { academyContact: { whatsapp: '+966566101447' } }])(
    'rejects %j with 400',
    async (payload) => {
      expect((await patch(payload)).statusCode).toBe(400);
      expect(settings.write).not.toHaveBeenCalled();
    },
  );
});
