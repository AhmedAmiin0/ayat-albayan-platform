import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageSender } from './message.sender';
import type { MessageWorker, PassJob } from './message.worker';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { dueMessage, fakeSwitches } from './sender.fakes';
import type { SenderRepo } from './sender.repo';

// docs/42 42-7 (review of #695, item 4): the chat ticker never waits behind a main pass.

const gate = fakeSwitches();
const queries = {
  approvedTemplates: vi.fn(), due: vi.fn(), holdAutomatic: vi.fn(), anyDue: vi.fn(),
};
const worker = { process: vi.fn(), deferRest: vi.fn(), release: vi.fn(async () => 0) };
const sender = () => new MessageSender(
  gate as unknown as SendGate, queries as unknown as SenderRepo, worker as unknown as MessageWorker,
);
const ROWS = {
  main: [dueMessage({ id: 'notice', template_key: null, body: 'تذكير', line: 'notifications' })],
  chat: [dueMessage({ id: 'chat', template_key: null, body: 'نص', line: 'chat', phone_e164: '+966500000002' })],
};

describe('MessageSender — the two tickers', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([]);
    queries.due.mockImplementation(async ({ lane }: { lane: 'chat' | 'main' }) => ROWS[lane]);
    worker.release.mockResolvedValue(0);
  });

  it('kick({ lane: chat }) sends the chat row while a main pass is blocked on a notifications row', async () => {
    let release = (): void => undefined;
    const blocked = new Promise<'sent'>((r) => { release = () => r('sent'); });
    worker.process.mockImplementation((job: PassJob) =>
      job.row.id === 'notice' ? blocked : Promise.resolve('sent'));
    const s = sender();
    const main = s.kick({ lane: 'main' });
    await vi.waitFor(() => expect(worker.process).toHaveBeenCalledTimes(1));
    let mainDone = false;
    void main.then(() => { mainDone = true; });
    await s.kick({ lane: 'chat' });
    const ids = worker.process.mock.calls.map(([job]) => (job as PassJob).row.id);
    expect(ids).toEqual(['notice', 'chat']);
    expect(mainDone).toBe(false);
    release();
    await main;
  });
});
