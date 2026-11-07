import { describe, expect, it, vi } from 'vitest';
import type { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { ThreadMessagesRepo } from '@/modules/messaging/inbox/threads/store';
import { Outbox } from './outbox';

// Follow-up to #694 (item 1): a send carries what the STORED row holds, so a correction hidden
// with «حذف من المنصة» (its view shows no body) is still compared on its own text.
const KEY = 'admin:+966500000001:req-1';
const STORED = messageRow({
  id: 'm1', status: 'sent', body: 'تصحيح: الخامسة', corrects_id: 'o1',
  correction_text: 'الخامسة', hidden_at: '2026-11-07T09:00:00Z',
});
const echo = { body: 'تصحيح: الخامسة', corrects_id: 'o1', correction_text: 'الخامسة' };

function outbox() {
  const queries = {
    enqueue: vi.fn(async () => ({ ...STORED, replayed: true })),
    byDedupKey: vi.fn(async () => STORED),
  };
  const sender = { kick: vi.fn(async () => undefined) };
  const views = { view: vi.fn(async (r: { id: string }) => ({ id: r.id, body: null })) };
  return new Outbox(
    queries as unknown as ThreadMessagesRepo,
    sender as unknown as MessageSender,
    views as unknown as MessageViews,
  );
}

describe('Outbox echo: the stored row, never its rendered view', () => {
  it('replayOf and a replayed queue both carry the hidden row’s own body and text', async () => {
    const box = outbox();
    const replay = await box.replayOf(KEY);
    expect([replay?.view.body, replay?.echo]).toEqual([null, echo]);
    const queued = await box.queue({ phone_e164: '+966500000001', body: 'x', dedup_key: KEY });
    expect([queued.view.body, queued.echo]).toEqual([null, echo]);
  });
});
