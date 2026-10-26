// Test fixtures and HTTP harness for the student channel (test-only, excluded from the build by *.fakes.ts).
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../../app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../../common/auth/auth.guard';
import type { AuthUser } from '../../../common/auth/verify-token';
import { PushService } from '../../../common/push/push.service';
import { PortalScopeQueries } from '../../people/portal/scope/portal-scope.queries';
import { TeachersQueries } from '../../people/teachers';
import { ChannelPeopleQueries } from './channel-people.queries';
import type { ChannelMessageRow } from './channel.queries';
import { ChannelQueries } from './channel.queries';

export const ST = '52000000-0000-4000-8000-000000000001';
/** Another family's child. */
export const OTHER = '52000000-0000-4000-8000-000000000002';
export const CH = 'c3000000-0000-4000-8000-000000000001';

const USERS: Record<string, AuthUser> = {
  teacher: { id: 'p-t1', email: null, role: 'teacher' },
  oldTeacher: { id: 'p-t2', email: null, role: 'teacher' },
  guardian: { id: 'p-g', email: null, role: 'guardian' },
  otherGuardian: { id: 'p-g2', email: null, role: 'guardian' },
  student: { id: 'p-s', email: null, role: 'student' },
  admin: { id: 'p-ad', email: null, role: 'admin' },
  sales: { id: 'p-sa', email: null, role: 'sales' },
  otherSales: { id: 'p-sb', email: null, role: 'sales' },
  assistant: { id: 'p-as', email: null, role: 'assistant' },
};
export type Who = keyof typeof USERS;
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

export const messageRow = (over: Partial<ChannelMessageRow> = {}): ChannelMessageRow => ({
  id: 'm1', body: 'السلام عليكم', sender_profile_id: 'p-g', sender_role: 'guardian', created_at: '2026-10-27T10:00:00.000Z', ...over,
});

export async function channelApp() {
  // The student's current teacher is t1 (p-t1); t2 taught them before and no longer does.
  const queries = {
    channelOf: vi.fn(async () => CH),
    page: vi.fn(async (): Promise<ChannelMessageRow[]> => [messageRow()]),
    insert: vi.fn(async (row: { body: string; sender_profile_id: string; sender_role: string }) => messageRow({ id: 'm2', ...row })),
    markRead: vi.fn(async () => undefined),
    teacherIds: vi.fn(async (): Promise<string[]> => ['t1']),
    teacherStudentIds: vi.fn(async () => [ST]),
    summaries: vi.fn(async () => [{ student_id: ST, unread: 2, last_body: 'السلام عليكم', last_role: 'guardian', last_at: '2026-10-27T10:00:00.000Z' }]),
  };
  const people = {
    students: vi.fn(async (ids: readonly string[]) => ids.filter((id) => id === ST || id === OTHER).map((id) => ({ id, name: 'سلمى', code: 'AB-0201' }))),
    names: vi.fn(async () => new Map([['p-g', 'أم سلمى'], ['p-t1', 'أبرار']])),
    ownedStudentIds: vi.fn(async (id: string) => (id === 'p-sa' ? [ST] : [])),
    teacherProfiles: vi.fn(async () => ['p-t1']),
  };
  const scope = { studentsOf: vi.fn(async (id: string) => (id === 'p-g' || id === 'p-s' ? [{ id: ST, code: 'AB-0201', name: 'سلمى', tz: 'Asia/Riyadh', contact_is_self: false }] : [])) };
  const teachers = { idByProfile: vi.fn(async (id: string) => ({ 'p-t1': 't1', 'p-t2': 't2' })[id] ?? null) };
  const push = { notifyProfiles: vi.fn(async () => undefined), notifyAdmins: vi.fn(), notifySales: vi.fn() };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(systemResolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ChannelQueries).useValue(queries)
    .overrideProvider(ChannelPeopleQueries).useValue(people)
    .overrideProvider(PortalScopeQueries).useValue(scope)
    .overrideProvider(TeachersQueries).useValue(teachers)
    .overrideProvider(PushService).useValue(push)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (method: 'GET' | 'POST', url: string, who: Who) => app.inject({ method, url, headers: { authorization: `Bearer ${who}` } });
  const post = (url: string, who: Who, payload: object) => app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${who}` }, payload });
  return { app, call, post, queries, people, scope, teachers, push };
}
