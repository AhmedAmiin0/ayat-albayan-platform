import { describe, expect, it, vi } from 'vitest';
import type { MessageViews } from '../../whatsapp/messages/message.views';
import type { MessageSender } from '../../whatsapp/sender/message.sender';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import type { ThreadsQueries } from '../threads/threads.queries';
import { Outbox } from './outbox';

const ROW = { phone_e164: '+966500000001', body: 'أهلًا', dedup_key: 'admin:+966500000001:req-1' };

function setup(status: 'queued' | 'sent', replayed = false) {
  const queries = { enqueue: vi.fn(async () => ({ ...messageRow({ id: 'm1', status }), replayed })), get: vi.fn(async () => null) };
  const sender = { kick: vi.fn(() => new Promise<void>(() => undefined)) }; // a pass that never ends (WhatsApp hangs)
  const views = { view: vi.fn(async (r: { id: string; status: string }) => ({ id: r.id, status: r.status })) };
  const outbox = new Outbox(queries as unknown as ThreadsQueries, sender as unknown as MessageSender, views as unknown as MessageViews);
  return { outbox, queries, sender };
}

describe('Outbox (rule 8 dedup, «instant send»)', () => {
  it('queue answers as soon as the row is queued: the sender is kicked, never awaited', async () => {
    const t = setup('queued');
    const sent = await t.outbox.queue(ROW);
    expect(sent).toEqual({ view: { id: 'm1', status: 'queued' }, replayed: false });
    expect(t.queries.enqueue).toHaveBeenCalledWith({ ...ROW, direction: 'outbound', status: 'queued' });
    expect(t.sender.kick).toHaveBeenCalledTimes(1);
  });

  it('queue keeps the dedup: a replayed request id answers the first row and kicks nothing', async () => {
    const t = setup('sent', true);
    expect(await t.outbox.queue(ROW)).toEqual({ view: { id: 'm1', status: 'sent' }, replayed: true });
    expect(t.sender.kick).not.toHaveBeenCalled();
  });

  it('send still waits for the pass (callers that report the outcome)', async () => {
    const t = setup('queued');
    const outcome = await Promise.race([t.outbox.send(ROW).then(() => 'answered'), new Promise((r) => setTimeout(() => r('waiting'), 20))]);
    expect(outcome).toBe('waiting');
  });
});
