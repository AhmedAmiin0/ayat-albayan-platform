import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageSender } from './message.sender';
import type { MessageWorker } from './message.worker';
import type { SendGate } from './gate/send-gate';
import { dueMessage } from './sender.fakes';
import type { SenderQueries } from './sender.queries';
import { templateRow } from './whatsapp.fakes';

const gate = { open: vi.fn(), automaticOn: vi.fn() };
const queries = { approvedTemplates: vi.fn(), due: vi.fn(), holdAutomatic: vi.fn() };
const worker = { process: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const booking = templateRow();
const reminder = templateRow({ key: 'lesson_reminder', meta_name: 'lesson_reminder_v2' });

const sender = () =>
  new MessageSender(gate as unknown as SendGate, queries as unknown as SenderQueries, worker as unknown as MessageWorker);

describe('MessageSender — the outbound pass (R-MSG-01/02, docs/12 §3.3)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    gate.open.mockResolvedValue(true);
    gate.automaticOn.mockResolvedValue(true);
    queries.approvedTemplates.mockResolvedValue([booking, reminder]);
    queries.holdAutomatic.mockResolvedValue(0);
    queries.due.mockResolvedValue([dueMessage(), dueMessage({ id: 'm2', template_key: null, body: 'وعليكم السلام' })]);
    worker.process.mockResolvedValueOnce('sent').mockResolvedValueOnce('retry');
  });

  it('kill switch / env / config closed → reads nothing, sends nothing, rows stay queued', async () => {
    gate.open.mockResolvedValue(false);
    await expect(sender().runOnce(NOW)).resolves.toEqual({ sent: 0, retry: 0, failed: 0, expired: 0, stale: 0, held: 0, paused: 0, skipped: 0 });
    expect(queries.due).not.toHaveBeenCalled();
    expect(worker.process).not.toHaveBeenCalled();
  });

  it('asks only for approved templates (plus session texts) and hands each row its registry row', async () => {
    const summary = await sender().runOnce(NOW);
    expect(queries.due).toHaveBeenCalledWith({ keys: ['booking_confirmation', 'lesson_reminder'], now: NOW, limit: 50 });
    expect(worker.process.mock.calls).toEqual([
      [{ row: dueMessage(), template: booking, now: NOW, autoOn: true }],
      [{ row: expect.objectContaining({ id: 'm2' }), template: null, now: NOW, autoOn: true }],
    ]);
    expect(summary).toEqual({ sent: 1, retry: 1, failed: 0, expired: 0, stale: 0, held: 0, paused: 0, skipped: 0 });
    expect(queries.holdAutomatic).not.toHaveBeenCalled();
  });

  it('automatic messages OFF: every job-made row is held up front (approved template or not), then per row', async () => {
    gate.automaticOn.mockResolvedValue(false);
    queries.holdAutomatic.mockResolvedValue(2); // e.g. the 2 renewal_due rows under a not-yet-approved template
    worker.process.mockReset().mockResolvedValueOnce('held').mockResolvedValueOnce('sent');
    const summary = await sender().runOnce(NOW);
    expect(queries.holdAutomatic.mock.invocationCallOrder[0]).toBeLessThan(queries.due.mock.invocationCallOrder[0] ?? 0);
    expect(worker.process.mock.calls.map(([job]) => job.autoOn)).toEqual([false, false]);
    expect(summary).toMatchObject({ held: 3, sent: 1 });
  });

  it('automatic messages turned OFF mid-pass: the switch is read before every row', async () => {
    gate.automaticOn.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
    await sender().runOnce(NOW);
    expect(worker.process.mock.calls.map(([job]) => job.autoOn)).toEqual([true, false]);
  });

  it('the kill switch is read before every row: OFF mid-pass stops the rest at once', async () => {
    gate.open.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValue(false);
    const summary = await sender().runOnce(NOW);
    expect(worker.process).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ sent: 1, retry: 0 });
  });

  it('a broken token (paused) stops the pass: the other rows are not tried', async () => {
    worker.process.mockReset().mockResolvedValue('paused');
    const summary = await sender().runOnce(NOW);
    expect(worker.process).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ paused: 1 });
  });

  it('never throws, even when the queue cannot be read', async () => {
    queries.due.mockRejectedValue(new Error('db down'));
    await expect(sender().runOnce(NOW)).resolves.toEqual({ sent: 0, retry: 0, failed: 0, expired: 0, stale: 0, held: 0, paused: 0, skipped: 0 });
  });

  it('kick is single-flight: a kick during a run queues exactly one more run', async () => {
    queries.due.mockResolvedValue([]);
    const s = sender();
    const first = s.kick();
    const second = s.kick();
    const third = s.kick();
    expect(second).toBe(first);
    expect(third).toBe(first);
    await first;
    expect(queries.due).toHaveBeenCalledTimes(2);
  });

  it('boot schedules the timers (unref’d) and destroy clears them', () => {
    vi.useFakeTimers();
    try {
      queries.due.mockResolvedValue([]);
      const s = sender();
      s.onApplicationBootstrap();
      vi.advanceTimersByTime(30_000);
      expect(gate.open).toHaveBeenCalled();
      s.onModuleDestroy();
    } finally {
      vi.useRealTimers();
    }
  });
});
