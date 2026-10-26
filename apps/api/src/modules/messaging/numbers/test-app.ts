// HTTP test harness for the numbers routes (test-only, excluded from the build): the real controllers
// and guards; the services are mocks.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { CommunicationsService } from './communications/communications.service';
import { NumbersImport } from './import/numbers.import';
import { NumbersService } from './numbers.service';

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

export async function numbersApp() {
  const m = {
    numbers: { list: vi.fn(async () => []), create: vi.fn(async () => ({})), update: vi.fn(async () => ({})), remove: vi.fn(async () => undefined), setSecret: vi.fn(async () => ({})), clearSecret: vi.fn(async () => ({})) },
    importer: { run: vi.fn(async () => ({ dry_run: true, changed: false, roles: [] })) },
    comms: { parity: vi.fn(async () => ({ source: 'legacy', roles: [], differences: [] })), setSource: vi.fn(async () => ({ source: 'legacy' })) },
  };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(NumbersService).useValue(m.numbers)
    .overrideProvider(NumbersImport).useValue(m.importer)
    .overrideProvider(CommunicationsService).useValue(m.comms)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (opts: { method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; url: string; token?: string; body?: object }) =>
    app.inject({ method: opts.method, url: opts.url, headers: { authorization: `Bearer ${opts.token ?? 'admin'}` }, ...(opts.body ? { payload: opts.body } : {}) });
  return { ...m, app, call };
}
