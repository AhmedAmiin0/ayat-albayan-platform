import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageSender } from './message.sender';
import type { MessageWorker } from './message.worker';
import type { SendGate } from '../gate/send-gate';
import { dueMessage, fakeSwitches } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { templateRow } from '../whatsapp.fakes';

// The auth pause is per line (docs/12 §13.3 step 4): a dead chat token never delays notifications.

const gate = fakeSwitches();
const queries = { approvedTemplates: vi.fn(), due: vi.fn(), holdAutomatic: vi.fn(), anyDue: vi.fn(), chatConfigured: false };
const worker = { process: vi.fn(), deferRest: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const chat = (id: string) => dueMessage({ id, template_key: null, body: 'نص', line: 'chat' });
const notif = (id: string) => dueMessage({ id });

const sender = () =>
  new MessageSender(gate as unknown as SendGate, queries as unknown as SenderQueries, worker as unknown as MessageWorker);
const ids = () => worker.process.mock.calls.map(([job]) => (job as { row: { id: string } }).row.id);

describe('MessageSender — per-line auth pause', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([templateRow()]);
    queries.holdAutomatic.mockResolvedValue(0);
    queries.anyDue.mockResolvedValue(true);
    queries.chatConfigured = false;
  });

  it('a paused chat row does not stop the following notifications rows', async () => {
    queries.due.mockResolvedValue([chat('c1'), notif('n1'), chat('c2'), notif('n2')]);
    worker.process.mockResolvedValueOnce('paused').mockResolvedValue('sent');
    const summary = await sender().runOnce(NOW);
    expect(ids()).toEqual(['c1', 'n1', 'n2']);
    expect(summary).toMatchObject({ paused: 1, sent: 2, skipped: 0 });
  });

  it('a paused notifications row does not stop the following chat rows', async () => {
    queries.due.mockResolvedValue([notif('n1'), chat('c1'), notif('n2'), chat('c2')]);
    worker.process.mockResolvedValueOnce('paused').mockResolvedValue('sent');
    const summary = await sender().runOnce(NOW);
    expect(ids()).toEqual(['n1', 'c1', 'c2']);
    expect(summary).toMatchObject({ paused: 1, sent: 2, skipped: 0 });
  });

  it('the rest of a paused line is skipped before the gate is read again, and not counted', async () => {
    queries.due.mockResolvedValue([chat('c1'), chat('c2'), chat('c3')]);
    worker.process.mockResolvedValue('paused');
    const summary = await sender().runOnce(NOW);
    expect(ids()).toEqual(['c1']);
    expect(gate.open).toHaveBeenCalledTimes(2); // the pass, then row c1 only
    expect(gate.automaticOn).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ sent: 0, retry: 0, failed: 0, expired: 0, stale: 0, held: 0, paused: 1, skipped: 0 });
  });

  it('one line: every row is notifications, so a pause ends the pass as before', async () => {
    queries.due.mockResolvedValue([notif('n1'), chat('t1'), notif('n2')].map((r) => ({ ...r, line: null })));
    worker.process.mockResolvedValue('paused');
    const summary = await sender().runOnce(NOW);
    expect(ids()).toEqual(['n1']);
    expect(summary).toMatchObject({ paused: 1 });
  });

  it('a chat starter template pauses with the chat line when two lines are in use (owner 2026-10-12)', async () => {
    queries.chatConfigured = true;
    const starter = templateRow({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', sales_starter: true });
    queries.approvedTemplates.mockResolvedValue([templateRow(), starter]);
    queries.due.mockResolvedValue([dueMessage({ id: 's1', template_key: 'academy_welcome' }), notif('n1'), chat('c1')]);
    worker.process.mockResolvedValueOnce('paused').mockResolvedValue('sent');
    const summary = await sender().runOnce(NOW);
    expect(ids()).toEqual(['s1', 'n1']);
    expect(summary).toMatchObject({ paused: 1, sent: 1 });
  });

  it('a paused line hands its later rows to deferRest in one call; the other line sends', async () => {
    queries.due.mockResolvedValue([chat('c1'), notif('n1'), chat('c2'), notif('n2'), chat('c3')]);
    worker.process.mockResolvedValueOnce('paused').mockResolvedValue('sent');
    await sender().runOnce(NOW);
    expect(ids()).toEqual(['c1', 'n1', 'n2']);
    expect(worker.deferRest).toHaveBeenCalledTimes(1);
    type Call = [{ row: { id: string } }, { id: string }[]];
    const [probe, rest] = worker.deferRest.mock.calls[0] as Call;
    expect([probe.row.id, rest.map((r) => r.id)]).toEqual(['c1', ['c2', 'c3']]);
  });
});
