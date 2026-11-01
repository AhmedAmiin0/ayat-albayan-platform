import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import { MessageSender } from './message.sender';
import type { MessageWorker } from './message.worker';
import { C1, N1, N2, routePass, THREE } from '@/modules/messaging/whatsapp/numbers/number-route.fakes';
import type { NumberRoutes } from '@/modules/messaging/whatsapp/numbers/number-routes';
import type { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { dueMessage, fakeSwitches } from './sender.fakes';
import type { SenderRepo } from './sender.repo';
import { templateRow } from '@/modules/messaging/whatsapp/whatsapp.fakes';

// docs/23c: legacy keeps today's pass (no new read); module mode routes each row to a number and pauses per number.

const gate = fakeSwitches();
const queries = { approvedTemplates: vi.fn(), due: vi.fn(), holdAutomatic: vi.fn(), anyDue: vi.fn(), chatConfigured: false };
const worker = { process: vi.fn(), deferRest: vi.fn() };
const routes = { pass: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const text = (id: string, number_id: string | null) => dueMessage({ id, template_key: null, body: 'نص', number_id });

function sender(withRoutes = true) {
  const s = new MessageSender(gate as unknown as SendGate, queries as unknown as SenderRepo, worker as unknown as MessageWorker);
  return withRoutes ? Object.assign(s, { routes: routes as unknown as NumberRoutes }) : s;
}
const jobs = () => worker.process.mock.calls.map(([j]) => j as { row: { id: string }; route?: unknown });
const install = () => setNumbersOverlay({ values: {}, numberIds: {}, numbers: THREE });

describe('MessageSender — routing per number', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([templateRow()]);
    queries.holdAutomatic.mockResolvedValue(0);
    queries.anyDue.mockResolvedValue(true);
    routes.pass.mockResolvedValue({ pass: routePass(), templates: [templateRow(), templateRow({ key: 'renewal_due', status: 'pending' })] });
    worker.process.mockResolvedValue('sent');
  });
  afterEach(() => setNumbersOverlay(null));

  it('legacy: today\'s pass, never the per-number reads, no route on any job', async () => {
    queries.due.mockResolvedValue([dueMessage()]);
    await sender().runOnce(NOW);
    expect(routes.pass).not.toHaveBeenCalled();
    expect(queries.approvedTemplates).toHaveBeenCalledTimes(1);
    expect(jobs()[0]).not.toHaveProperty('route');
  });

  it('module: templates approved on some number are due too, and each row carries its number', async () => {
    install();
    queries.due.mockResolvedValue([dueMessage(), text('t1', N2), text('t2', null)]);
    await sender().runOnce(NOW);
    expect(queries.approvedTemplates).not.toHaveBeenCalled();
    expect(queries.due).toHaveBeenCalledWith({ keys: ['booking_confirmation', 'renewal_due'], now: NOW, limit: 50 });
    expect(jobs().map((j) => j.route)).toEqual([
      { numberId: N1, line: 'notifications' },
      { numberId: N2, line: 'notifications' },
      { numberId: N1, line: 'notifications' },
    ]);
  });

  it('module: a row no number can send goes to the worker with route null (it stays queued)', async () => {
    install();
    queries.due.mockResolvedValue([text('t1', 'unknown-number')]);
    worker.process.mockResolvedValue('skipped');
    expect(await sender().runOnce(NOW)).toMatchObject({ skipped: 1, sent: 0 });
    expect(jobs()[0]?.route).toBeNull();
  });

  it('module: a broken token pauses that NUMBER only; the other numbers keep sending', async () => {
    install();
    queries.due.mockResolvedValue([text('a', N1), text('b', N2), text('c', N1), text('d', C1)]);
    worker.process.mockResolvedValueOnce('paused').mockResolvedValue('sent');
    const summary = await sender().runOnce(NOW);
    expect(jobs().map((j) => j.row.id)).toEqual(['a', 'b', 'd']);
    expect(summary).toMatchObject({ paused: 1, sent: 2 });
  });

  it('module without the routes provider, or with unreadable approvals: nothing sends', async () => {
    install();
    queries.due.mockResolvedValue([dueMessage()]);
    await sender(false).runOnce(NOW);
    routes.pass.mockRejectedValueOnce(new Error('down'));
    await sender().runOnce(NOW);
    expect(worker.process).not.toHaveBeenCalled();
  });
});
