import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import type { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { messageRow } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { Outbox, SETTLE_POLL_MS, SETTLE_POLLS } from './outbox';

const ROW = { phone_e164: '+966500000001', body: 'أهلًا', dedup_key: 'admin:+966500000001:req-1' };

function setup(status: 'queued' | 'sent', replayed = false) {
  const queries = { enqueue: vi.fn(async () => ({ ...messageRow({ id: 'm1', status }), replayed })), get: vi.fn(async () => null) };
  const sender = { kick: vi.fn(() => new Promise<void>(() => undefined)) }; // a pass that never ends (WhatsApp hangs)
  const views = { view: vi.fn(async (r: { id: string; status: string }) => ({ id: r.id, status: r.status })) };
  const outbox = new Outbox(queries as unknown as ThreadsRepo, sender as unknown as MessageSender, views as unknown as MessageViews);
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

describe('Outbox.send on an API copy (docs/09: the pass runs on the worker)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  function split(statuses: ('queued' | 'sent')[]) {
    vi.stubEnv('APP_ROLE', 'api');
    vi.useFakeTimers();
    const t = setup('queued');
    t.sender.kick.mockResolvedValue(undefined);
    for (const status of statuses) t.queries.get.mockResolvedValueOnce(messageRow({ id: 'm1', status }) as never);
    return t;
  }

  it('a row the worker sends a moment after its kick answered is reported sent', async () => {
    const t = split(['queued', 'queued', 'sent']);
    const sent = t.outbox.send(ROW);
    await vi.advanceTimersByTimeAsync(2 * SETTLE_POLL_MS);
    expect((await sent).view.status).toBe('sent');
    expect(t.queries.get).toHaveBeenCalledTimes(3);
  });

  it('still queued after the bounded wait: answers queued (the worker sends it on its poll)', async () => {
    const t = split(Array.from({ length: SETTLE_POLLS + 5 }, () => 'queued' as const));
    const sent = t.outbox.send(ROW);
    await vi.advanceTimersByTimeAsync(SETTLE_POLLS * SETTLE_POLL_MS);
    expect((await sent).view.status).toBe('queued');
    expect(t.queries.get).toHaveBeenCalledTimes(1 + SETTLE_POLLS);
  });

  it('one process (all): no extra reads, the local pass already ran', async () => {
    vi.stubEnv('APP_ROLE', 'all');
    const t = setup('queued');
    t.sender.kick.mockResolvedValue(undefined);
    await t.outbox.send(ROW);
    expect(t.queries.get).toHaveBeenCalledTimes(1);
  });
});
