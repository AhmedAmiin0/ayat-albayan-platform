// HTTP test harness for the inbox routes (test-only): real controllers, guards, services, registry
// and MessageViews; the queries, line clients, gate and sender are mocks. `client` = notifications,
// `chatClient` = chat (docs/12 §13.16), both configured; resetting files re-prime `configured`.
import type { AuthUser } from '@/common/auth/verify-token';
import { SETTING_DEFAULTS } from '@ab/settings';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { messagingRoot } from '@/common/infra/test-root';
import { InboxModule } from './inbox.module';
import { LessonRatingModule } from '@/modules/teaching/lesson-rating';
import { AuditService } from '@/common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import { ChatListsRepo } from '@/modules/messaging/chat-lists/chat-lists.repo';
import { SalesRepo } from '@/modules/sales/sales/shared';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { ReopenRequest } from '@/modules/messaging/whatsapp/sender/window/reopen-request';
import { ReopenPick } from '@/modules/messaging/whatsapp/sender/window/manual-send';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import { WHATSAPP_CLIENT, WHATSAPP_LINES } from '@/modules/messaging/whatsapp/whatsapp.types';
import { TeacherThreadsRepo } from './teacher-threads/teacher-threads.repo';
import { ThreadsRepo } from './threads/threads.repo';
import { ThreadMessagesRepo, ThreadReadsRepo } from './threads/store';
import { DeltaRepo } from './delta/delta.repo';
import { SyncRepo } from './delta/sync.repo';
import { MessageHideRepo } from './hide/message-hide.repo';
import { StickerRepo } from '@/modules/messaging/inbox/stickers/sticker.repo';
import { ChatSearchRepo, MessageSearchRepo } from './reads/search';
import { InboxSettings, type InboxSettingsValues } from './inbox.settings';
import { inboxMocks } from './inbox-app.fakes';

export { NO_PEOPLE } from './inbox-app.fakes';

/** The inbox settings at the registry defaults, no DB read (the ring threshold, file size). */
const inboxSettings = () => ({
  read: async (): Promise<InboxSettingsValues> => ({
    upload_max_mb: SETTING_DEFAULTS.upload_max_mb,
    renewal_alert_remaining: SETTING_DEFAULTS.renewal_alert_remaining,
  }),
});

export const ADMIN: AuthUser = {
  id: 'a0000000-0000-4000-8000-000000000001',
  email: null,
  role: 'admin',
};
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


/**
 * `resolve`: the system roles as seeded by default; a test may grant a role more (a DB-edited
 * role).
 */
export async function inboxApp(resolve: PermissionResolver = systemResolver) {
  const m = inboxMocks();
  // MessageViews reads TemplatesQueries.cached: the test's `get` mock, never a copy kept between
  // tests.
  const templates = { ...m.templates, cached: (key: string) => m.templates.get(key) };
  const root = messagingRoot(InboxModule, LessonRatingModule);
  const mod = await Test.createTestingModule({ imports: [root] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolve)
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(ThreadsRepo).useValue(m.queries)
    .overrideProvider(ThreadMessagesRepo).useValue(m.queries)
    .overrideProvider(ThreadReadsRepo).useValue(m.queries)
    .overrideProvider(TeacherThreadsRepo).useValue(m.teacher)
    .overrideProvider(SalesRepo).useValue(m.sales)
    .overrideProvider(ChatListsRepo).useValue(m.lists)
    .overrideProvider(TemplatesRepo).useValue(templates)
    .overrideProvider(WHATSAPP_CLIENT).useValue(m.client)
    .overrideProvider(WHATSAPP_LINES).useValue({ notifications: m.client, chat: m.chatClient })
    .overrideProvider(SendGate).useValue(m.gate)
    .overrideProvider(MessageSender).useValue(m.sender)
    .overrideProvider(AuditService).useValue(m.audit)
    .overrideProvider(ReopenRequest).useValue(m.reopenRequest)
    .overrideProvider(ReopenPick).useValue(m.reopenPick)
    .overrideProvider(InboxSettings).useValue(inboxSettings())
    .overrideProvider(MessageHideRepo).useValue(m.hides)
    .overrideProvider(DeltaRepo).useValue(m.delta)
    .overrideProvider(SyncRepo).useValue(m.sync)
    .overrideProvider(StickerRepo).useValue(m.stickers)
    .overrideProvider(ChatSearchRepo).useValue(m.search)
    .overrideProvider(MessageSearchRepo).useValue(m.messageSearch)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (input: {
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    url: string;
    token?: string;
    body?: object;
  }) =>
    app.inject({
      method: input.method,
      url: input.url,
      headers: { authorization: `Bearer ${input.token ?? 'admin'}` },
      ...(input.body ? { payload: input.body } : {}),
    });
  return { ...m, app, call };
}
