import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakePolicy } from '../notification-rules/policy.fakes';
import { ReportPdfJob } from './report-pdf.job';
import type { ReportPdfPublisher } from './report-pdf.publisher';
import type { ReportPdfQueries } from './report-pdf.queries';

const queries = {
  recoverStale: vi.fn(),
  pendingIds: vi.fn(),
  claim: vi.fn(),
  finish: vi.fn(),
  queueMessage: vi.fn(),
};
const publisher = { publish: vi.fn(), close: vi.fn() };
const NOW = new Date('2026-10-02T08:00:00Z');
const message = { dedup_key: 'report_ready:r1' };

function job(policy = fakePolicy()) {
  const j = new ReportPdfJob(queries as unknown as ReportPdfQueries, publisher as unknown as ReportPdfPublisher, policy);
  j.wait = vi.fn(async () => undefined);
  return j;
}

describe('ReportPdfJob — the R-REP-03 queue worker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queries.recoverStale.mockResolvedValue(0);
    queries.pendingIds.mockResolvedValue(['r1', 'r2']);
    queries.claim.mockResolvedValue(3);
    queries.finish.mockResolvedValue(true);
    queries.queueMessage.mockResolvedValue(undefined);
    publisher.publish.mockImplementation(async (id: string) => ({ path: `s/${id}.pdf`, message }));
    publisher.close.mockResolvedValue(undefined);
  });

  it('claims each pending report, stores the PDF, queues the message, then marks that version ready', async () => {
    const summary = await job().runOnce(NOW);
    expect(summary).toEqual({ recovered: 0, rendered: 2, failed: 0, skipped: 0, held: 0 });
    expect(queries.pendingIds).toHaveBeenCalledWith(20);
    expect(queries.claim.mock.calls).toEqual([['r1'], ['r2']]);
    expect(queries.queueMessage).toHaveBeenCalledWith(message);
    expect(queries.finish).toHaveBeenCalledWith({ id: 'r1', version: 3, status: 'ready', path: 's/r1.pdf' });
    const order = [publisher.publish, queries.queueMessage, queries.finish].map((f) => f.mock.invocationCallOrder[0]);
    expect(order).toEqual([...order].sort((a = 0, b = 0) => a - b));
  });

  it('first puts back rows left `rendering` for more than 10 minutes', async () => {
    queries.recoverStale.mockResolvedValue(1);
    const summary = await job().runOnce(NOW);
    expect(queries.recoverStale).toHaveBeenCalledWith(new Date('2026-10-02T07:50:00Z'));
    expect(summary.recovered).toBe(1);
  });

  it('skips a report another worker claimed first (compare-and-set lost)', async () => {
    queries.claim.mockResolvedValueOnce(null);
    const summary = await job().runOnce(NOW);
    expect(summary).toEqual({ recovered: 0, rendered: 1, failed: 0, skipped: 1, held: 0 });
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledWith('r2', expect.any(Date));
  });

  it('retries a failing render with 2 s then 8 s backoff, and succeeds', async () => {
    queries.pendingIds.mockResolvedValue(['r1']);
    publisher.publish
      .mockRejectedValueOnce(new Error('chromium crashed'))
      .mockRejectedValueOnce(new Error('storage 503'));
    const j = job();
    const summary = await j.runOnce(NOW);
    expect(summary.rendered).toBe(1);
    expect(vi.mocked(j.wait).mock.calls).toEqual([[2_000], [8_000]]);
    expect(queries.finish).toHaveBeenCalledWith(expect.objectContaining({ status: 'ready' }));
  });

  it('after three failed attempts marks the claimed version failed with the error, and goes on', async () => {
    publisher.publish.mockImplementation(async (id: string) => {
      if (id === 'r1') throw new Error('x'.repeat(600));
      return { path: 's/r2.pdf', message };
    });
    const summary = await job().runOnce(NOW);
    expect(summary).toEqual({ recovered: 0, rendered: 1, failed: 1, skipped: 0, held: 0 });
    expect(publisher.publish).toHaveBeenCalledTimes(4);
    expect(queries.finish).toHaveBeenCalledWith({ id: 'r1', version: 3, status: 'failed', error: 'x'.repeat(500) });
    expect(queries.queueMessage).toHaveBeenCalledTimes(1);
  });

  it('a failing message queue counts as a failed publish (retried, then failed)', async () => {
    queries.pendingIds.mockResolvedValue(['r1']);
    queries.queueMessage.mockRejectedValue(new Error('messages down'));
    const summary = await job().runOnce(NOW);
    expect(summary.failed).toBe(1);
    expect(queries.finish).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed', error: 'messages down' }));
  });

  it('a report resubmitted mid-render (ready CAS lost) is left pending for the next run', async () => {
    queries.pendingIds.mockResolvedValue(['r1']);
    queries.finish.mockResolvedValue(false);
    const summary = await job().runOnce(NOW);
    expect(summary.rendered).toBe(1);
    expect(queries.finish).toHaveBeenCalledTimes(1);
  });

  it('closes Chromium after a run that rendered, not after an idle one', async () => {
    await job().runOnce(NOW);
    expect(publisher.close).toHaveBeenCalledTimes(1);
    publisher.close.mockClear();
    queries.pendingIds.mockResolvedValue([]);
    await job().runOnce(NOW);
    expect(publisher.close).not.toHaveBeenCalled();
  });

  it('module mode, the report_ready row off: the PDF is stored and ready, no message queued', async () => {
    const summary = await job(fakePolicy({ mode: 'module', rows: [{ key: 'report_ready', enabled: false }] })).runOnce(NOW);
    expect(summary).toEqual({ recovered: 0, rendered: 2, failed: 0, skipped: 0, held: 0 });
    expect(queries.queueMessage).not.toHaveBeenCalled();
    expect(queries.finish).toHaveBeenCalledWith({ id: 'r1', version: 3, status: 'ready', path: 's/r1.pdf' });
  });

  it('rules unreadable: no message and not ready, so the report is retried (an essential row is never dropped)', async () => {
    const summary = await job(fakePolicy({ fail: true })).runOnce(NOW);
    expect(summary.rendered).toBe(0);
    expect(queries.queueMessage).not.toHaveBeenCalled();
    expect(queries.finish).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'ready' }));
  });

  it('never throws, even when the queue cannot be read', async () => {
    queries.recoverStale.mockRejectedValue(new Error('db down'));
    await expect(job().runOnce(NOW)).resolves.toEqual({ recovered: 0, rendered: 0, failed: 0, skipped: 0, held: 0 });
  });
});
