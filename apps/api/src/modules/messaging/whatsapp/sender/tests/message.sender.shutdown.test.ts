import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { STUB_WA_ENV, rows } from '@/modules/messaging/whatsapp/gate/send-gate.fakes';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { WhatsappSettings } from '@/modules/messaging/whatsapp/whatsapp.settings';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import type { MessageWorker } from '@/modules/messaging/whatsapp/sender/message.worker';
import { dueMessage } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';

// BE-14: a deploy's SIGTERM waits for the row between its claim and 'sent', and claims no other.

const NOW = new Date('2026-11-07T08:00:00Z');
const ON = rows({ messaging_enabled: true, auto_messages_enabled: true });

function slowWorker() {
  let finish: () => void = () => undefined;
  const sending = new Promise<void>((r) => {
    finish = r;
  });
  const process = vi.fn(async () => {
    await sending;
    return 'sent' as const;
  });
  const worker = { process, deferRest: vi.fn(), release: vi.fn(async () => 0) };
  return { worker, process, finish };
}

function setup() {
  const due = [
    dueMessage({ template_key: null, body: 'أولى' }),
    dueMessage({ id: 'm0000000-0000-4000-8000-000000000002', template_key: null, body: 'ثانية' }),
  ];
  const fake = fakeDb({
    settings: [ON, ON, ON, ON], messages: [{ data: due }], message_templates: [{ data: [] }],
  });
  const slow = slowWorker();
  const gate = new SendGate(new WhatsappSettings(fake.db), fake.db);
  const repo = new SenderRepo(fake.db);
  const sender = new MessageSender(gate, repo, slow.worker as unknown as MessageWorker);
  return { sender, ...slow };
}

describe('MessageSender — shutdown during a send (BE-14)', () => {
  beforeEach(() => Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v)));
  afterEach(() => vi.unstubAllEnvs());

  it('waits for the row in flight to record sent, then claims no further row', async () => {
    const { sender, process, finish } = setup();
    const kicked = sender.kick({ lane: 'main' });
    await vi.waitFor(() => expect(process).toHaveBeenCalledTimes(1));
    let down = false;
    const shutdown = sender.beforeApplicationShutdown().then(() => {
      down = true;
    });
    await Promise.resolve();
    expect(down).toBe(false);
    finish();
    await shutdown;
    expect(down).toBe(true);
    await expect(process.mock.results[0]?.value).resolves.toBe('sent');
    expect(process).toHaveBeenCalledTimes(1);
    await kicked;
  });

  it('a pass after shutdown reads the queue but claims nothing', async () => {
    const { sender, process } = setup();
    await sender.beforeApplicationShutdown();
    await sender.runOnce(NOW, { kicked: true });
    expect(process).not.toHaveBeenCalled();
  });
});
