import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TemplateView } from '@ab/shared';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { laneOfRow, type TemplateRegistry } from '@/modules/messaging/whatsapp';
import type { Outbox } from './outbox';
import { ThreadSendService } from './thread-send.service';

// docs/42 42-7 (review of #695, item 1b): a chat-line starter is queued on the chat lane, so it
// reaches the family before a chat text queued after it. Fakes only: nothing is sent.

const ACTOR = 's0000000-0000-4000-8000-000000000001';
const REQ = 'c0000000-0000-4000-8000-000000000001';
const CHAT_ENV = {
  WA_API_BASE: 'http://wa-stub.test', WA_PHONE_NUMBER_ID: 'n-phone', WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token-fake', WA_CHAT_PHONE_NUMBER_ID: 'c-phone', WA_CHAT_WABA_ID: 'c-waba',
  WA_CHAT_ACCESS_TOKEN: 'chat-token-fake',
};

const queries = { thread: vi.fn(), numberWindows: vi.fn() };
const templates = { approved: vi.fn() };
const outbox = { queue: vi.fn() };
const view = (line: 'chat' | 'notifications') =>
  ({ key: 'academy_welcome', line, params: [], buttons: [], header_format: null, body_ar: 'أهلًا' }) as unknown as TemplateView;
const send = () =>
  new ThreadSendService(
    queries as unknown as ThreadsRepo,
    templates as unknown as TemplateRegistry,
    outbox as unknown as Outbox,
  ).template({ phone: PHONE, input: { key: 'academy_welcome', params: {}, clientRequestId: REQ }, actorId: ACTOR });
const queued = (): { line?: string | null } =>
  (outbox.queue.mock.calls[0]?.[0] ?? {}) as { line?: string | null };

describe('ThreadSendService.template — the lane stamp', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.thread.mockResolvedValue(threadRow());
    outbox.queue.mockImplementation(async (row: object) => ({ view: { id: 'm1', ...row }, replayed: false }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('a chat-line starter with the chat line configured: line chat → the chat lane', async () => {
    Object.entries(CHAT_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
    templates.approved.mockResolvedValue(view('chat'));
    await send();
    expect(queued().line).toBe('chat');
    expect(laneOfRow({ line: queued().line ?? null })).toBe('chat');
  });

  it('a notifications template stays unstamped (main lane)', async () => {
    Object.entries(CHAT_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
    templates.approved.mockResolvedValue(view('notifications'));
    await send();
    expect(queued()).not.toHaveProperty('line');
  });

  it('a chat starter on one line (no chat client) stays unstamped, as lineOf sends it', async () => {
    vi.stubEnv('WA_CHAT_PHONE_NUMBER_ID', '');
    templates.approved.mockResolvedValue(view('chat'));
    await send();
    expect(queued()).not.toHaveProperty('line');
  });
});
