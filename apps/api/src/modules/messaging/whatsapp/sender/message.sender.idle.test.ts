import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { STUB_WA_ENV, rows } from '@/modules/messaging/whatsapp/gate/send-gate.fakes';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { WhatsappSettings } from '@/modules/messaging/whatsapp/whatsapp.settings';
import { MessageSender } from './message.sender';
import type { MessageWorker } from './message.worker';
import { dueMessage } from './sender.fakes';
import { SenderRepo } from './sender.repo';

const NOW = new Date('2026-10-02T08:00:00Z');
const ON = rows({ messaging_enabled: true, auto_messages_enabled: true });
const worker = { process: vi.fn(async () => 'sent' as const), deferRest: vi.fn() };

/** The real gate and queries on a counting fake db: `trips` = one entry per PostgREST round trip. */
function sender(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const gate = new SendGate(new WhatsappSettings(fake.db), fake.db);
  return { ...fake, sender: new MessageSender(gate, new SenderRepo(fake.db), worker as unknown as MessageWorker) };
}

describe('MessageSender — round trips per tick (owner 2026-10-27: the API is slowed)', () => {
  beforeEach(() => Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v)));
  afterEach(() => vi.unstubAllEnvs());

  it('idle tick, gate open: 2 round trips (was 4: two switch reads, the approved templates, the queue)', async () => {
    const { sender: s, trips, argsOf } = sender({ settings: [ON], messages: [{ data: [] }] });
    await s.runOnce(NOW);
    expect(trips).toEqual(['settings', 'messages']);
    expect(argsOf('messages', 'limit')).toEqual([1]);
    expect(worker.process).not.toHaveBeenCalled();
  });

  it('idle tick, automatic messages OFF: the hold still runs first, then the probe (3, was 5)', async () => {
    const off = rows({ messaging_enabled: true, auto_messages_enabled: false });
    const { sender: s, trips } = sender({ settings: [off], messages: [{ data: [] }, { data: [] }] });
    await s.runOnce(NOW);
    expect(trips).toEqual(['settings', 'messages', 'messages']);
  });

  it('gate closed: one settings read, nothing else (unchanged)', async () => {
    const { sender: s, trips } = sender({ settings: [rows({ messaging_enabled: false })] });
    await s.runOnce(NOW);
    expect(trips).toEqual(['settings']);
  });

  it('due rows: the pass as before, and ONE uncached switch read per row (was two)', async () => {
    const due = [dueMessage({ template_key: null, body: 'نص' }), dueMessage({ id: 'm2', template_key: null, body: 'نص' })];
    const { sender: s, trips } = sender({ settings: [ON, ON, ON], messages: [{ data: [{ id: 'x' }] }, { data: due }], message_templates: [{ data: [] }] });
    await expect(s.runOnce(NOW)).resolves.toMatchObject({ sent: 2 });
    expect(trips).toEqual(['settings', 'messages', 'message_templates', 'messages', 'settings', 'settings']);
  });

  it('the kill switch turned OFF mid-pass still stops the next row at once', async () => {
    const due = [dueMessage({ template_key: null }), dueMessage({ id: 'm2', template_key: null })];
    const off = rows({ messaging_enabled: false });
    const { sender: s } = sender({ settings: [ON, ON, off], messages: [{ data: [{ id: 'x' }] }, { data: due }], message_templates: [{ data: [] }] });
    worker.process.mockClear();
    await s.runOnce(NOW);
    expect(worker.process).toHaveBeenCalledTimes(1);
  });
});
