import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE, threadRow } from '@/modules/messaging/inbox/inbox.fakes';
import { sameNumber, type SendFrom } from '@/modules/messaging/inbox/threads/thread-quotes';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import type { TemplateRegistry } from '@/modules/messaging/whatsapp';
import type { Outbox } from '@/modules/messaging/inbox/send/outbox';
import { ThreadSendService } from '@/modules/messaging/inbox/send/thread-send.service';
import { target } from './correction.fakes';

// Review of #694 (round 4, item 2): a correction that would leave from another line than its
// original has no reply context, so the family would get a bare «تصحيح: …» in another chat: 409.
const NOW = new Date('2026-10-31T10:00:00Z');
const ORIGINAL = target().id;
const LINES = {
  WA_API_BASE: 'http://wa-stub.test',
  WA_PHONE_NUMBER_ID: 'n-phone',
  WA_WABA_ID: 'n-waba',
  WA_ACCESS_TOKEN: 'meta-token-fake',
  WA_CHAT_PHONE_NUMBER_ID: 'c-phone',
  WA_CHAT_WABA_ID: 'c-waba',
  WA_CHAT_PROVIDER: 'meta',
};
const queries = { thread: vi.fn(), numberWindows: vi.fn() };
const outbox = { queue: vi.fn(), replayOf: vi.fn() };
/** The original went out on the chat line: only a send from that line may name its wamid. */
const quotes = {
  target: vi.fn(async (_phone: string, id: string, from: SendFrom) => ({
    reply_to_message_id: id,
    reply_to_wa_id: sameNumber({ line: 'chat' }, from) ? 'wamid.O' : null,
  })),
};
const service = () => {
  const s = new ThreadSendService(
    queries as unknown as ThreadsRepo,
    {} as TemplateRegistry,
    outbox as unknown as Outbox,
  );
  Object.assign(s, { quotes, corrections: { target: vi.fn(async () => target()) } });
  return s;
};
const correct = () =>
  service().text(
    {
      phone: PHONE,
      input: { text: 'الخامسة', clientRequestId: 'r1', correctsId: ORIGINAL },
      actorId: target().created_by ?? '',
    },
    NOW,
  );
const at = (hoursAgo: number) => new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString();

describe('a correction from another line than its original', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const [k, v] of Object.entries(LINES)) vi.stubEnv(k, v);
    outbox.replayOf.mockResolvedValue(null);
    outbox.queue.mockImplementation(async (row: object) => ({ view: row, replayed: false }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it('chat window closed, notifications window open: 409 correction_other_number', async () => {
    queries.thread.mockResolvedValue(
      threadRow({ last_chat_inbound_at: at(30), last_notifications_inbound_at: at(1) }),
    );
    await expect(correct()).rejects.toMatchObject({
      response: { code: 'correction_other_number' },
      status: 409,
    });
    expect(outbox.queue).not.toHaveBeenCalled();
  });

  it('the chat window open: queued as a reply to the original', async () => {
    queries.thread.mockResolvedValue(
      threadRow({ last_chat_inbound_at: at(1), last_notifications_inbound_at: at(30) }),
    );
    await correct();
    expect(outbox.queue).toHaveBeenCalledWith(
      expect.objectContaining({ reply_to_wa_id: 'wamid.O', corrects_id: ORIGINAL }),
    );
  });
});
