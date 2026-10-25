// HTTP test harness for the inbox routes (test-only, excluded from the build). Real controllers,
// guards, services, registry and MessageViews; the DB-facing queries, the line clients, the gate and
// the sender are mocks. `client` = notifications, `chatClient` = chat (docs/12 §13.16): both
// configured by default; files that reset all mocks re-prime `configured` in beforeEach.
import type { ThreadWindow } from './send-number';
import type { ChatListRef, ThreadLesson, ThreadPeople } from '@ab/shared';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { PermissionResolver } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { ChatListsQueries } from '../chat-lists/chat-lists.queries';
import { SalesQueries } from '../sales/sales.queries';
import { MessageSender } from '../whatsapp/sender/message.sender';
import { SendGate } from '../whatsapp/gate/send-gate';
import { TemplatesQueries, type ApprovalRow } from '../whatsapp/templates.queries';
import { WHATSAPP_CLIENT, WHATSAPP_LINES } from '../whatsapp/whatsapp.types';
import type { KnownNumber } from './known-number';
import type { FamilyTag } from './thread-people.mapper';
import { TeacherThreadsQueries } from './teacher-threads.queries';
import { ThreadsQueries } from './threads.queries';

export const NO_PEOPLE: ThreadPeople = { guardian: null, lead: null, students: [] };
export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const TEACHER: AuthUser = { id: 't1', email: null, role: 'teacher' };
export const SALES: AuthUser = { id: 's1', email: null, role: 'sales' };
const USERS: Record<string, AuthUser> = {
  admin: ADMIN,
  teacher: TEACHER,
  sales: SALES,
  salesB: { id: 's2', email: null, role: 'sales' },
  unlinked: { id: 't9', email: null, role: 'teacher' },
  guardian: { id: 'g9', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

function mocks() {
  return {
    queries: {
      ...{ list: vi.fn(), thread: vi.fn(), messages: vi.fn(), markInboundRead: vi.fn(), enqueue: vi.fn(), get: vi.fn() },
      lessonTeacher: vi.fn(),
      numberWindows: vi.fn(async (): Promise<ThreadWindow[]> => []),
      known: vi.fn(async (): Promise<KnownNumber | null> => null),
      lessons: vi.fn(async (): Promise<ThreadLesson[]> => []),
      people: vi.fn(async () => NO_PEOPLE),
      familyTags: vi.fn(async () => new Map<string, FamilyTag>()),
    },
    teacher: {
      ...{ teacher: vi.fn(), phones: vi.fn(), unread: vi.fn(), stampRead: vi.fn() },
      ...{ myStudentIds: vi.fn(), guardianStudents: vi.fn() },
    },
    sales: { ownership: vi.fn() },
    lists: {
      ...{ all: vi.fn(), one: vi.fn(), count: vi.fn(), create: vi.fn(), rename: vi.fn(), remove: vi.fn(), add: vi.fn(), drop: vi.fn() },
      listsOf: vi.fn(async (): Promise<ChatListRef[]> => []),
    },
    templates: { all: vi.fn(), get: vi.fn(), update: vi.fn(), approvals: vi.fn(async (): Promise<ApprovalRow[]> => []) },
    client: { configured: vi.fn(() => true), markRead: vi.fn() },
    chatClient: { configured: vi.fn(() => true), markRead: vi.fn() },
    gate: { open: vi.fn() },
    sender: { kick: vi.fn() },
    audit: { record: vi.fn() },
  };
}

/** `resolve`: the system roles as seeded by default; a test may grant a role more (a DB-edited role). */
export async function inboxApp(resolve: PermissionResolver = systemResolver) {
  const m = mocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolve).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ThreadsQueries).useValue(m.queries)
    .overrideProvider(TeacherThreadsQueries).useValue(m.teacher)
    .overrideProvider(SalesQueries).useValue(m.sales)
    .overrideProvider(ChatListsQueries).useValue(m.lists)
    .overrideProvider(TemplatesQueries).useValue(m.templates)
    .overrideProvider(WHATSAPP_CLIENT).useValue(m.client)
    .overrideProvider(WHATSAPP_LINES).useValue({ notifications: m.client, chat: m.chatClient })
    .overrideProvider(SendGate).useValue(m.gate)
    .overrideProvider(MessageSender).useValue(m.sender)
    .overrideProvider(AuditService).useValue(m.audit)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (input: { method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'; url: string; token?: string; body?: object }) =>
    app.inject({
      method: input.method,
      url: input.url,
      headers: { authorization: `Bearer ${input.token ?? 'admin'}` },
      ...(input.body ? { payload: input.body } : {}),
    });
  return { ...m, app, call };
}
