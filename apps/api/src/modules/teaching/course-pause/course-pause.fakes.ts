// Test fixtures and HTTP harness for the course pause routes (test-only, excluded from the build by *.fakes.ts).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { fakeSettings } from '../../../common/settings/settings.fakes';
import { SettingsService } from '../../../common/settings/settings.service';
import { CoursePauseFollowUps } from './course-pause.follow-ups';
import type { PauseRow, RpcOut } from './course-pause.mapper';
import { CoursePauseQueries } from './course-pause.queries';

export const STUDENT = '5a000000-0000-4000-8000-0000000000a1';
export const PAUSE = 'c0000000-0000-4000-8000-0000000000c1';
export const SUB = 'b0000000-0000-4000-8000-0000000000b1';
export const OLD_SUB = 'b0000000-0000-4000-8000-0000000000b2';
export const SALES = 'sa000000-0000-4000-8000-0000000000a1';
export const ADMIN = 'ad000000-0000-4000-8000-0000000000ad';

const USERS: Record<string, AuthUser> = {
  admin: { id: ADMIN, email: null, role: 'admin' },
  sales: { id: SALES, email: null, role: 'sales' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  assistant: { id: 'as000000-0000-4000-8000-0000000000a5', email: null, role: 'assistant' },
};
export const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

const pauseRow = (over: Partial<PauseRow> = {}): PauseRow => ({
  id: PAUSE, student_id: STUDENT, from_date: '2026-11-01', until_date: '2026-11-10', reason: 'سفر', created_at: '2026-10-28T09:00:00Z',
  resumed_at: null, extended_days: null, creator: { full_name: 'سارة' }, ...over,
});

export const rpcOut = (over: Partial<RpcOut> = {}): RpcOut => ({
  id: PAUSE, student_id: STUDENT, cancelled: ['l1', 'l2'], left: ['g1'], reopened: [], rejoined: [], rule_ids: [], ...over,
});

export function pauseMocks() {
  return {
    queries: {
      call: vi.fn(), studentExists: vi.fn(), pauses: vi.fn(), pause: vi.fn(), openPause: vi.fn(), due: vi.fn(), dueStarts: vi.fn(), previewCount: vi.fn(), lessons: vi.fn(), liftLegacyPause: vi.fn(),
    },
    follow: { after: vi.fn(), liftedLegacy: vi.fn(), paused: vi.fn(), resumed: vi.fn() },
  };
}
type PauseMocks = ReturnType<typeof pauseMocks>;

export function resetPauseMocks(m: PauseMocks): void {
  vi.clearAllMocks();
  m.queries.studentExists.mockResolvedValue(true);
  m.queries.call.mockResolvedValue(rpcOut());
  m.queries.pause.mockResolvedValue(pauseRow());
  m.queries.pauses.mockResolvedValue([pauseRow(), pauseRow({ id: 'old', resumed_at: '2026-09-10T09:00:00Z', extended_days: 7 })]);
  m.queries.openPause.mockResolvedValue({ id: PAUSE, subscription_id: SUB });
  m.queries.previewCount.mockResolvedValue(3);
  m.follow.after.mockResolvedValue(0);
  m.queries.liftLegacyPause.mockResolvedValue([]);
}

type Call = { method: 'GET' | 'POST' | 'PATCH'; url: string; token: keyof typeof USERS; body?: object };

export async function pauseApp() {
  const m = pauseMocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(CoursePauseQueries).useValue(m.queries)
    .overrideProvider(CoursePauseFollowUps).useValue(m.follow)
    .overrideProvider(SettingsService).useValue(fakeSettings())
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (c: Call) =>
    app.inject({ method: c.method, url: c.url, headers: { authorization: `Bearer ${c.token}` }, ...(c.body ? { payload: c.body } : {}) });
  return { app, call, m, reset: () => resetPauseMocks(m) };
}
