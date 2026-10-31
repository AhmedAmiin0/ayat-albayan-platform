import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import type { ThreadsQueries } from '@/modules/messaging/inbox/threads/threads.queries';
import type { TemplateRegistry } from '@/modules/messaging/whatsapp';
import type { Outbox } from './outbox';
import { ThreadSendService } from './thread-send.service';

// ThreadSendService.text after the 24 h window (owner 2026-10-31). Fakes only: no Kapso, no Meta.

const NOW = new Date('2026-10-31T10:00:00Z');
const ACTOR = 's0000000-0000-4000-8000-000000000001';
const REQ = 'c0000000-0000-4000-8000-000000000001';
const old = '2026-10-29T10:00:00Z';
const closed = threadRow({ last_inbound_at: old, last_notifications_inbound_at: old });
const LINES = {
  WA_API_BASE: 'http://wa-stub.test',
  WA_PHONE_NUMBER_ID: 'n-phone',
  WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token-fake',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  KAPSO_API_BASE: 'http://wa-stub.test/kapso',
  KAPSO_API_KEY: 'kapso-key-fake',
};

const queries = { thread: vi.fn(), numberWindows: vi.fn() };
const outbox = { queue: vi.fn() };
const kapso = { reopen: vi.fn() };
const service = () => {
  const q = queries as unknown as ThreadsQueries;
  const s = new ThreadSendService(q, {} as TemplateRegistry, outbox as unknown as Outbox);
  Object.assign(s, { kapso });
  return s;
};
const text = () =>
  service().text({ phone: PHONE, input: { text: 'السلام عليكم', clientRequestId: REQ }, actorId: ACTOR }, NOW);
const chatOn = (provider: 'meta' | 'kapso') => {
  for (const [k, v] of Object.entries({ ...LINES, WA_CHAT_PROVIDER: provider })) vi.stubEnv(k, v);
};

describe('ThreadSendService.text after the window', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.thread.mockResolvedValue(closed);
    outbox.queue.mockImplementation(async (row: object) => ({ view: { id: 'm1', ...row }, replayed: false }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('kapso chat line: Kapso reopened first, then the text queued from the chat line', async () => {
    chatOn('kapso');
    kapso.reopen.mockResolvedValue(true);
    await text();
    expect(outbox.queue).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'السلام عليكم', line: 'chat', dedup_key: `admin:${PHONE}:${REQ}` }),
    );
    const [reopened] = kapso.reopen.mock.invocationCallOrder;
    const [queued] = outbox.queue.mock.invocationCallOrder;
    expect(reopened).toBeLessThan(queued ?? 0);
  });

  it('a failed reopen (KapsoReopener answers false) still queues the text', async () => {
    chatOn('kapso');
    kapso.reopen.mockResolvedValue(false);
    await text();
    expect(outbox.queue).toHaveBeenCalledWith(expect.objectContaining({ line: 'chat' }));
  });

  it('a meta chat line: 409 session_closed as before, nothing queued, no reopen', async () => {
    chatOn('meta');
    const e = await text().catch((x: unknown) => x);
    expect((e as { getStatus(): number }).getStatus()).toBe(409);
    expect(outbox.queue).not.toHaveBeenCalled();
    expect(kapso.reopen).not.toHaveBeenCalled();
  });
});
