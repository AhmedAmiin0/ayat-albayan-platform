// HTTP test harness for the WhatsApp routes (test-only, excluded from the build). Real controllers,
// guards, registry and services; the DB-facing queries, the client, storage and the sender are mocks.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '../../app.module';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '../../common/auth/auth.guard';
import type { PermissionResolver } from '../../common/auth/permissions';
import type { AuthUser } from '../../common/auth/verify-token';
import { StorageService } from '../../common/storage/storage.service';
import { LineHealthStore } from './line-health.store';
import { LinesCheck } from './lines.check';
import { MessageSender } from './message.sender';
import { MessagesQueries } from './messages.queries';
import { SendGate } from './send-gate';
import { TemplatesQueries } from './templates.queries';
import { WHATSAPP_CLIENT, WHATSAPP_LINES } from './whatsapp.types';

export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
const TEACHER: AuthUser = { id: 'p0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
const SALES: AuthUser = { id: 's0000000-0000-4000-8000-000000000003', email: null, role: 'sales' };
const ASSISTANT: AuthUser = { id: 's0000000-0000-4000-8000-000000000004', email: null, role: 'assistant' };
/** A custom role (base sales) for the dynamic-roles cases; its grants come from the test's resolver. */
const CUSTOM: AuthUser = { id: 's0000000-0000-4000-8000-000000000005', email: null, role: 'sales' };
const USERS: Record<string, AuthUser> = { admin: ADMIN, teacher: TEACHER, sales: SALES, assistant: ASSISTANT, custom: CUSTOM };
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

const clientMock = () => ({
  configured: vi.fn(() => false),
  getTemplates: vi.fn(),
  submitTemplate: vi.fn(),
  canUploadSamples: vi.fn(),
  uploadSample: vi.fn(),
});

function mocks() {
  return {
    templates: { all: vi.fn(), get: vi.fn(), update: vi.fn(), insert: vi.fn() },
    messages: { get: vi.fn(), requeue: vi.fn(), markSentManually: vi.fn(), handOff: vi.fn() },
    gate: { view: vi.fn(), open: vi.fn(), automaticOn: vi.fn(async () => true) },
    client: clientMock(),
    /** A SEPARATE object (docs/12 §13.16): per-line calls can be told apart. */
    chatClient: clientMock(),
    lines: { check: vi.fn() },
    health: { save: vi.fn(), all: vi.fn(async () => []) },
    storage: { signedDownload: vi.fn() },
    sender: { kick: vi.fn() },
    audit: { record: vi.fn() },
  };
}

export async function whatsappApp(resolver: PermissionResolver = systemResolver) {
  const m = mocks();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(resolver).overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(TemplatesQueries).useValue(m.templates)
    .overrideProvider(MessagesQueries).useValue(m.messages)
    .overrideProvider(WHATSAPP_CLIENT).useValue(m.client)
    .overrideProvider(WHATSAPP_LINES).useValue({ notifications: m.client, chat: m.chatClient })
    .overrideProvider(LinesCheck).useValue(m.lines)
    .overrideProvider(LineHealthStore).useValue(m.health)
    .overrideProvider(StorageService).useValue(m.storage)
    .overrideProvider(MessageSender).useValue(m.sender)
    .overrideProvider(SendGate).useValue(m.gate)
    .overrideProvider(AuditService).useValue(m.audit)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { rawBody: true });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (input: { method: 'GET' | 'POST' | 'PATCH'; url: string; token?: string; body?: object }) =>
    app.inject({
      method: input.method,
      url: input.url,
      headers: { authorization: `Bearer ${input.token ?? 'admin'}` },
      ...(input.body ? { payload: input.body } : {}),
    });
  return { ...m, app, call };
}
