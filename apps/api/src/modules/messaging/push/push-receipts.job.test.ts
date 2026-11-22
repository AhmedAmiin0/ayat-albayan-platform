import { describe, expect, it, vi } from 'vitest';
import type { ExpoReceipt } from './push-receipts';
import { PushReceiptsJob } from './push-receipts.job';
import type { PushReceiptsRepo, TicketRow } from './push-receipts.repo';

const NOW = new Date('2026-10-02T12:00:00Z');
/** The receipt Expo sends for a device FCM dropped: it names no token. */
const GONE: ExpoReceipt = {
  status: 'error',
  message: 'The recipient device is not registered with FCM.',
  details: { error: 'DeviceNotRegistered' },
};
const OLD = 'ExponentPushToken[old]';
const LIVE = 'ExponentPushToken[live]';

const row = (id: string, tickets: Record<string, string>, over: Partial<TicketRow> = {}) => ({
  id,
  profile_id: 'a1',
  ticket_ids: Object.keys(tickets),
  ticket_tokens: tickets,
  error: null,
  created_at: '2026-10-02T11:00:00.000Z',
  ...over,
});

function setup(rows: TicketRow[], receipts: Record<string, ExpoReceipt>) {
  const queries = {
    unchecked: vi.fn(async () => rows),
    settle: vi.fn(async () => undefined),
    prune: vi.fn(async (_row: TicketRow, tokens: readonly string[]) => [...tokens]),
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

  it('a DeviceNotRegistered receipt naming no token prunes the token its ticket went to', async () => {
    const p1 = row('p1', { t1: OLD, t2: LIVE });
    const { job, queries, transport } = setup([p1], { t1: GONE, t2: { status: 'ok' } });
    expect(await job.runOnce(NOW)).toEqual({ rows: 1, settled: 1, pruned: 1 });
    expect(transport).toHaveBeenCalledWith(['t1', 't2']);
    expect(queries.prune).toHaveBeenCalledWith(p1, [OLD]);
    expect(queries.settle).toHaveBeenCalledWith('p1', {
      ticket_ids: [],
      ticket_tokens: {},
      error: 'The recipient device is not registered with FCM.',
    });
  });

  it('ok receipts prune nothing; a pending ticket stays with its token', async () => {
    const { job, queries } = setup([row('p1', { t1: LIVE, t2: OLD })], { t1: { status: 'ok' } });
    expect(await job.runOnce(NOW)).toEqual({ rows: 1, settled: 1, pruned: 0 });
    expect(queries.settle).toHaveBeenCalledWith('p1', {
      ticket_ids: ['t2'],
      ticket_tokens: { t2: OLD },
      error: null,
    });
    expect(queries.prune).not.toHaveBeenCalled();
  });

  it('a row with no receipt in yet is left as it is', async () => {
    const { job, queries } = setup([row('p1', { t1: OLD })], {});
    expect(await job.runOnce(NOW)).toEqual({ rows: 1, settled: 0, pruned: 0 });
    expect(queries.settle).not.toHaveBeenCalled();
    expect(queries.prune).not.toHaveBeenCalled();
  });

  it('a token two rows went to is pruned once', async () => {
    const rows = [row('p1', { t1: OLD }), row('p2', { t2: OLD })];
    const { job, queries } = setup(rows, { t1: GONE, t2: GONE });
    expect(await job.runOnce(NOW)).toEqual({ rows: 2, settled: 2, pruned: 1 });
    expect(queries.prune).toHaveBeenCalledTimes(1);
    expect(queries.settle).toHaveBeenCalledTimes(2);
  });

  it('a token the older row could not delete (bound again since) is tried for the newer row', async () => {
    const rows = [row('p1', { t1: OLD }), row('p2', { t2: OLD })];
    const { job, queries } = setup(rows, { t1: GONE, t2: GONE });
    queries.prune.mockResolvedValueOnce([]);
    expect(await job.runOnce(NOW)).toEqual({ rows: 2, settled: 2, pruned: 1 });
    expect(queries.prune).toHaveBeenCalledTimes(2);
  });

  it('a row sent before ticket_tokens existed prunes nothing and still settles', async () => {
    const { job, queries } = setup([row('p1', {}, { ticket_ids: ['t1'] })], { t1: GONE });
    expect(await job.runOnce(NOW)).toEqual({ rows: 1, settled: 1, pruned: 0 });
    expect(queries.prune).not.toHaveBeenCalled();
    expect(queries.settle).toHaveBeenCalledWith('p1', expect.objectContaining({ ticket_ids: [] }));
  });

  it('a receipt that names its token still prunes it on an old row', async () => {
    const named: ExpoReceipt = { ...GONE, details: { error: 'DeviceNotRegistered', expoPushToken: OLD } };
    const p1 = row('p1', {}, { ticket_ids: ['t1'] });
    const { job, queries } = setup([p1], { t1: named });
    await job.runOnce(NOW);
    expect(queries.prune).toHaveBeenCalledWith(p1, [OLD]);
  });

  it('keeps an earlier ticket error', async () => {
    const { job, queries } = setup([row('p1', { t1: LIVE }, { error: 'rate limited' })], {
      t1: { status: 'error', message: 'later' },
    });
    await job.runOnce(NOW);
    expect(queries.settle).toHaveBeenCalledWith('p1', {
      ticket_ids: [],
      ticket_tokens: {},
      error: 'rate limited',
    });
  });

  it('never throws: Expo down is logged, retried next run', async () => {
    const { job, transport, queries } = setup([row('p1', { t1: LIVE })], {});
    transport.mockRejectedValueOnce(new Error('expo receipts HTTP 503'));
    await expect(job.runOnce(NOW)).resolves.toEqual({ rows: 1, settled: 0, pruned: 0 });
    expect(queries.settle).not.toHaveBeenCalled();
  });
});
