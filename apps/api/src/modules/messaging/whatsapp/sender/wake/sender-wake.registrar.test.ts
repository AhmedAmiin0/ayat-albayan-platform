import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetSenderWake, wakeSender } from '@/common/jobs';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import type { MessageWorker } from '@/modules/messaging/whatsapp/sender/message.worker';
import { dueMessage, fakeSwitches } from '@/modules/messaging/whatsapp/sender/sender.fakes';
import type { SenderRepo } from '@/modules/messaging/whatsapp/sender/sender.repo';
import { SenderWake } from './sender-wake.registrar';

// docs/42 42-1: a job's wake starts a NORMAL pass of the real sender; the OFF switches are still
// read (uncached) before every row (docs/42 §3, docs/26 26-P4).

const gate = fakeSwitches();
const queries = {
  approvedTemplates: vi.fn(), due: vi.fn(), holdAutomatic: vi.fn(), anyDue: vi.fn(),
};
const worker = { process: vi.fn(), deferRest: vi.fn(), release: vi.fn() };

const sender = () => new MessageSender(
  gate as unknown as SendGate,
  queries as unknown as SenderRepo,
  worker as unknown as MessageWorker,
);
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe('SenderWake: the sender behind wakeSender()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([]);
    queries.holdAutomatic.mockResolvedValue(0);
    queries.anyDue.mockResolvedValue(true);
    queries.due.mockResolvedValue([dueMessage(), dueMessage({ id: 'm2' }), dueMessage({ id: 'm3' })]);
    worker.release.mockResolvedValue(0);
    worker.process.mockResolvedValue('sent');
  });

  afterEach(() => {
    resetSenderWake();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('worker / all: a wake runs one pass here, the gate read before the pass and before EVERY row', async () => {
    vi.stubEnv('APP_ROLE', 'worker');
    new SenderWake(sender()).onModuleInit();
    wakeSender();
    await flush();
    expect(worker.process).toHaveBeenCalledTimes(3);
    expect(gate.open).toHaveBeenCalledTimes(1 + 3);
  });

  it('OFF lands mid-pass after a wake: the rest stays queued', async () => {
    vi.stubEnv('APP_ROLE', 'all');
    gate.open.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
    new SenderWake(sender()).onModuleInit();
    wakeSender();
    await flush();
    expect(worker.process).toHaveBeenCalledTimes(1);
  });

  it('api: the wake goes to the worker (kickWorker), no pass runs in this process', async () => {
    vi.stubEnv('APP_ROLE', 'api');
    vi.stubEnv('WORKER_URL', '');
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    new SenderWake(sender()).onModuleInit();
    wakeSender();
    await flush();
    expect(gate.open).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('message-sender: no WORKER_URL'));
  });

  it('destroy forgets the kick: a later wake does nothing', async () => {
    vi.stubEnv('APP_ROLE', 'worker');
    const wake = new SenderWake(sender());
    wake.onModuleInit();
    wake.onModuleDestroy();
    wakeSender();
    await flush();
    expect(gate.open).not.toHaveBeenCalled();
  });

  it('app A closing after app B registered keeps the kick of B (identity check)', async () => {
    vi.stubEnv('APP_ROLE', 'worker');
    const a = new SenderWake(sender());
    a.onModuleInit();
    new SenderWake(sender()).onModuleInit();
    a.onModuleDestroy();
    wakeSender();
    await flush();
    expect(worker.process).toHaveBeenCalledTimes(3);
  });
});
