import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { STUB_WA_ENV, rows } from '@/modules/messaging/whatsapp/gate/send-gate.fakes';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { WhatsappSettings } from '@/modules/messaging/whatsapp/whatsapp.settings';
import { MessageSender } from './message.sender';
import type { MessageWorker } from './message.worker';
import { emptySummary } from './pass';
import { dueMessage } from './sender.fakes';
import { SenderRepo } from './sender.repo';

// docs/42 42-4: a kick's pass skips the idle probe; the uncached gate is still read first and
// before every row, and automatic-OFF holds and the release still run before the queue read.

const NOW = new Date('2026-11-07T08:00:00Z');
const ON = rows({ messaging_enabled: true, auto_messages_enabled: true });
const worker = {
  process: vi.fn(async () => 'sent' as const), deferRest: vi.fn(), release: vi.fn(async () => 0),
};

function sender(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  const gate = new SendGate(new WhatsappSettings(fake.db), fake.db);
  const s = new MessageSender(gate, new SenderRepo(fake.db), worker as unknown as MessageWorker);
  return { ...fake, sender: s };
}

describe('MessageSender — a kicked pass (docs/42 42-4)', () => {
  beforeEach(() => Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v)));
  afterEach(() => vi.unstubAllEnvs());

  it('no probe: gate, templates, the queue, then the gate again before the row', async () => {
    const due = [dueMessage({ template_key: null, body: 'نص' })];
    const db = { settings: [ON, ON], messages: [{ data: due }], message_templates: [{ data: [] }] };
    const { sender: s, trips } = sender(db);
    await expect(s.runOnce(NOW, true)).resolves.toMatchObject({ sent: 1 });
    expect(trips).toEqual(['settings', 'message_templates', 'messages', 'settings']);
  });

  it('gate closed: still one settings read and nothing else', async () => {
    const { sender: s, trips } = sender({ settings: [rows({ messaging_enabled: false })] });
    await s.runOnce(NOW, true);
    expect(trips).toEqual(['settings']);
  });

  it('automatic OFF: the hold and the release still come before the queue read', async () => {
    const off = rows({ messaging_enabled: true, auto_messages_enabled: false });
    const empty = { data: [] };
    const db = { settings: [off], messages: [empty, empty], message_templates: [empty] };
    const { sender: s, trips } = sender(db);
    worker.release.mockClear();
    await s.runOnce(NOW, true);
    expect(trips).toEqual(['settings', 'messages', 'message_templates', 'messages']);
    expect(worker.release).toHaveBeenCalledTimes(1);
  });

  it('kick() marks the pass it starts; the timer pass keeps the probe', async () => {
    const { sender: s } = sender({});
    const run = vi.spyOn(s, 'runOnce').mockResolvedValue(emptySummary());
    await s.kick();
    expect(run.mock.calls[0]?.[1]).toBe(true);
  });
});
