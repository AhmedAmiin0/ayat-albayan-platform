import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import type { MessageWorker } from '@/modules/messaging/whatsapp/sender/message.worker';
import { dueMessage, fakeSwitches } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';

// The pass and the chat window (owner 2026-11-03): released first, a fresh hold's template at once.

const gate = fakeSwitches();
const queries = {
  approvedTemplates: vi.fn(),
  due: vi.fn(),
  holdAutomatic: vi.fn(),
  anyDue: vi.fn(),
};
const worker = { process: vi.fn(), deferRest: vi.fn(), release: vi.fn() };
const NOW = new Date('2026-11-03T08:00:00Z');
const sender = () =>
  new MessageSender(
    gate as unknown as SendGate,
    queries as unknown as SenderRepo,
    worker as unknown as MessageWorker,
  );

describe('MessageSender with the chat window', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([]);
    queries.anyDue.mockResolvedValue(true);
    queries.due.mockResolvedValue([dueMessage({ template_key: null, body: 'نص', line: 'chat' })]);
    worker.release.mockResolvedValue(0);
  });

  it('send gate off: nothing released, nothing processed', async () => {
    gate.open.mockResolvedValue(false);
    await sender().runOnce(NOW);
    expect(worker.release).not.toHaveBeenCalled();
    expect(worker.process).not.toHaveBeenCalled();
  });

  it('released before the queue is read, so a released text goes in this pass', async () => {
    worker.process.mockResolvedValue('sent');
    await sender().runOnce(NOW);
    const [released] = worker.release.mock.invocationCallOrder;
    const [read] = queries.due.mock.invocationCallOrder;
    expect(released).toBeLessThan(read ?? 0);
  });

  it('a text just held: ONE more pass, which sends the reopen template it queued', async () => {
    worker.process.mockResolvedValueOnce('waiting').mockResolvedValueOnce('sent');
    const summary = await sender().runOnce(NOW);
    expect(queries.due).toHaveBeenCalledTimes(2);
    expect(summary).toMatchObject({ waiting: 1, sent: 1 });
  });

  it('nothing held: one pass only', async () => {
    worker.process.mockResolvedValue('sent');
    await sender().runOnce(NOW);
    expect(queries.due).toHaveBeenCalledOnce();
  });
});
