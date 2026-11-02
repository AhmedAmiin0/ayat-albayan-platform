import { describe, expect, it, vi } from 'vitest';
import type { ExpoReceipt } from './push-receipts';
import { PushReceiptsJob } from './push-receipts.job';
import type { PushReceiptsRepo, TicketRow } from './push-receipts.repo';

const NOW = new Date('2026-10-02T12:00:00Z');
const gone = (token: string): ExpoReceipt => ({
  status: 'error',
  message: 'gone',
  details: { error: 'DeviceNotRegistered', expoPushToken: token },
});

function setup(rows: TicketRow[], receipts: Record<string, ExpoReceipt>) {
  const queries = {
    unchecked: vi.fn(async () => rows),
    settle: vi.fn(async () => undefined),
    prune: vi.fn(async (_id: string, tokens: readonly string[]) => tokens.length),
  };
  const transport = vi.fn(async () => receipts);
  const job = new PushReceiptsJob(queries as unknown as PushReceiptsRepo, transport);
  return { job, queries, transport };
}

describe('PushReceiptsJob.runOnce (R-MOB-01 receipts)', () => {
  it('checks pushes sent 15 min – 24 h ago', async () => {
    const { job, queries, transport } = setup([], {});
    await job.runOnce(NOW);
    expect(queries.unchecked).toHaveBeenCalledWith({
      from: new Date('2026-10-01T12:00:00Z'),
      to: new Date('2026-10-02T11:45:00Z'),
    });
    expect(transport).not.toHaveBeenCalled();
  });

  it('settles checked tickets, keeps pending ones, prunes dead tokens from that admin', async () => {
    const rows: TicketRow[] = [
      { id: 'p1', profile_id: 'a1', ticket_ids: ['t1', 't2'], error: null },
      { id: 'p2', profile_id: 'a1', ticket_ids: ['t3'], error: null },
      { id: 'p3', profile_id: 'a2', ticket_ids: ['t4'], error: null },
    ];
    const { job, queries, transport } = setup(rows, {
      t1: { status: 'ok' },
      t3: gone('ExponentPushToken[old]'),
    });
    expect(await job.runOnce(NOW)).toEqual({ rows: 3, settled: 2, pruned: 1 });
    expect(transport).toHaveBeenCalledWith(['t1', 't2', 't3', 't4']);
    expect(queries.settle).toHaveBeenCalledWith('p1', { ticket_ids: ['t2'], error: null });
    expect(queries.settle).toHaveBeenCalledWith('p2', { ticket_ids: [], error: 'gone' });
    expect(queries.settle).not.toHaveBeenCalledWith('p3', expect.anything());
    expect(queries.prune).toHaveBeenCalledWith('a1', ['ExponentPushToken[old]']);
    expect(queries.prune).toHaveBeenCalledTimes(1);
  });

  it('keeps an earlier ticket error', async () => {
    const rows: TicketRow[] = [{ id: 'p1', profile_id: 'a1', ticket_ids: ['t1'], error: 'rate limited' }];
    const { job, queries } = setup(rows, { t1: { status: 'error', message: 'later' } });
    await job.runOnce(NOW);
    expect(queries.settle).toHaveBeenCalledWith('p1', { ticket_ids: [], error: 'rate limited' });
  });

  it('never throws: Expo down is logged, retried next run', async () => {
    const { job, transport, queries } = setup([{ id: 'p1', profile_id: 'a1', ticket_ids: ['t1'], error: null }], {});
    transport.mockRejectedValueOnce(new Error('expo receipts HTTP 503'));
    await expect(job.runOnce(NOW)).resolves.toEqual({ rows: 1, settled: 0, pruned: 0 });
    expect(queries.settle).not.toHaveBeenCalled();
  });
});
