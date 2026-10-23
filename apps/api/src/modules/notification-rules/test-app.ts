// HTTP test harness for GET /admin/notifications (test-only, excluded from the build): the real
// controller, guards and service; settings, the gate and the readers are mocks.
import type { LineHealthView } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { AuthUser } from '../../common/auth/verify-token';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';
import { SendGate } from '../whatsapp/send-gate';
import { RulesQueries } from './rules.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  teacher: { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' },
  sales: { id: 's0000000-0000-4000-8000-000000000003', email: null, role: 'sales' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export async function rulesApp() {
  const m = {
    settings: fakeSettings(),
    gate: { state: vi.fn(async () => ({ open: false, reason: 'switch_off' })), open: vi.fn(async () => false) },
    queries: { templates: vi.fn(async () => new Map()), lines: vi.fn(async (): Promise<LineHealthView[]> => []) },
  };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SettingsService).useValue(m.settings)
    .overrideProvider(SendGate).useValue(m.gate)
    .overrideProvider(RulesQueries).useValue(m.queries)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const get = (url: string, token = 'admin') => app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${token}` } });
  return { ...m, app, get };
}
