import { SETTING_DEFAULTS } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { SettingsService } from '../../common/settings/settings.service';

export const ADMIN_ID = 'a0000000-0000-4000-8000-000000000001';
const USERS: Record<string, AuthUser> = {
  admin: { id: ADMIN_ID, email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

/** Tests only: AppModule over fake auth, a mocked SettingsService and AuditService (gate routes). */
export function gateApp() {
  const settings = { all: vi.fn(), write: vi.fn() };
  const audit = { record: vi.fn() };
  let app: NestFastifyApplication | undefined;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
      .overrideProvider(SettingsService).useValue(settings)
      .overrideProvider(AuditService).useValue(audit)
      .compile();
    app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(() => app?.close());
  return {
    settings,
    audit,
    reset: () => {
      vi.resetAllMocks();
      settings.all.mockResolvedValue(SETTING_DEFAULTS);
    },
    put: (url: string, payload: object, token = 'admin') => {
      if (!app) throw new Error('app not ready');
      return app.inject({ method: 'PUT', url, payload, headers: { authorization: `Bearer ${token}` } });
    },
  };
}
