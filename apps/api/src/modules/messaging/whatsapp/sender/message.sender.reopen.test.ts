import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageSender } from './message.sender';
import type { MessageWorker, PassJob } from './message.worker';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { dueMessage, fakeSwitches } from './sender.fakes';
import type { SenderRepo } from './sender.repo';

// docs/42 42-7 (review of #695, item 1): the reopen template and chat starters ride the chat lane,
// so the chat pass that held a text sends its reopen template at once, and a starter and a text
// to one family go out in the order they were queued. Fakes only: nothing is sent.

const gate = fakeSwitches();
const queries = {
  approvedTemplates: vi.fn(), due: vi.fn(), holdAutomatic: vi.fn(), anyDue: vi.fn(),
};
const worker = { process: vi.fn(), deferRest: vi.fn(), release: vi.fn(async () => 0) };
const NOW = new Date('2026-11-07T08:00:00Z');
const PHONE = '+966500000001';
const REOPEN = { key: 'chat_reopen', line: 'chat', status: 'approved' };

const sender = () => new MessageSender(
  gate as unknown as SendGate, queries as unknown as SenderRepo, worker as unknown as MessageWorker,
);
const sentIds = () => worker.process.mock.calls.map(([job]) => (job as PassJob).row.id);

describe('MessageSender — chat-line templates on the chat lane', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([REOPEN]);
    worker.release.mockResolvedValue(0);
  });

  it('a chat pass whose text was held sends the reopen template it queued in the extra pass', async () => {
    const text = dueMessage({ id: 'text', template_key: null, body: 'نص', line: 'chat', phone_e164: PHONE });
    const reopen = dueMessage({ id: 'reopen', template_key: 'chat_reopen', line: 'chat', phone_e164: PHONE });
    queries.due.mockResolvedValueOnce([text]).mockResolvedValueOnce([reopen]);
    worker.process.mockImplementation(async (job: PassJob) => (job.row.id === 'text' ? 'waiting' : 'sent'));
    const summary = await sender().runOnce(NOW, { lane: 'chat', kicked: true });
    expect(queries.due).toHaveBeenCalledTimes(2);
    expect(queries.due.mock.calls.every(([i]) => (i as { lane: string }).lane === 'chat')).toBe(true);
    expect(sentIds()).toEqual(['text', 'reopen']);
    expect(summary).toMatchObject({ waiting: 1, sent: 1 });
  });

  it('a chat starter then a chat text to one phone go out in created order', async () => {
    const starter = dueMessage({ id: 'starter', template_key: 'chat_reopen', line: 'chat', phone_e164: PHONE });
    const text = dueMessage({ id: 'text', template_key: null, body: 'نص', line: 'chat', phone_e164: PHONE });
    queries.due.mockResolvedValue([starter, text]);
    worker.process.mockResolvedValue('sent');
    await sender().runOnce(NOW, { lane: 'chat', kicked: true });
    expect(sentIds()).toEqual(['starter', 'text']);
  });
});
