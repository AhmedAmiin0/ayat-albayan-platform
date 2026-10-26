// HTTP test harness for the calls routes (test-only, excluded from the build): the real AppModule with
// its guards and controllers; wa_calls in memory, the Kapso calls API and the setting faked. No hosted call.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { AuditService } from '../../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { TeacherThreadsQueries } from '../inbox/teacher-threads/teacher-threads.queries';
import { ThreadsQueries } from '../inbox/threads/threads.queries';
import { CallsSettings } from './calls.settings';
import { FakeCallsQueries, fakeApi, FAMILY } from './calls.fakes';
import { CALLS_API } from './kapso/calls-api';
import { CallsQueries } from './store/calls.queries';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' },
  sales: { id: 's1', email: null, role: 'sales' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  guardian: { id: 'g9', email: null, role: 'guardian' },
  assistant: { id: 'as1', email: null, role: 'assistant' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export async function callsApp(input: { on: boolean }) {
  const queries = new FakeCallsQueries();
  const api = fakeApi();
  const settings = { read: vi.fn(async () => ({ whatsapp_calls_enabled: input.on })) };
  const threads = { thread: vi.fn(async () => ({ guardian_id: 'g1', lead_id: null })), numberWindows: vi.fn(async () => []) };
  const teacher = {
    teacher: vi.fn(async () => ({ id: 'tch1', display_name_ar: 'معلمة', phone_e164: '+201009999999' })),
    phones: vi.fn(async () => [FAMILY]),
  };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(CallsQueries).useValue(queries)
    .overrideProvider(CALLS_API).useValue(api)
    .overrideProvider(CallsSettings).useValue(settings)
    .overrideProvider(ThreadsQueries).useValue(threads)
    .overrideProvider(TeacherThreadsQueries).useValue(teacher)
    .overrideProvider(AuditService).useValue({ record: vi.fn() })
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (req: { method: 'GET' | 'POST'; url: string; token?: string; body?: object }) =>
    app.inject({ method: req.method, url: req.url, headers: { authorization: `Bearer ${req.token ?? 'admin'}` }, ...(req.body ? { payload: req.body } : {}) });
  return { app, call, queries, api, settings };
}
