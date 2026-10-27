import { describe, expect, it, vi } from 'vitest';
import { NotificationPolicy } from '../../messaging/notification-rules/policy/policy';
import { fakeRulesReader, type FakePolicyInput } from '../../messaging/notification-rules/policy/policy.fakes';
import { ReportPdfJob } from './report-pdf.job';
import type { ReportPdfPublisher } from './report-pdf.publisher';
import type { Finish, ReportPdfQueries } from './report-pdf.queries';

const NOW = new Date('2026-10-02T08:00:00Z');
type Row = { status: string; version: number };

/** A stateful pdf_status queue (claim / finish compare-and-set) and a dedup'd messages table. */
function world() {
  const rows = new Map<string, Row>([['r1', { status: 'pending', version: 1 }]]);
  const sent = new Set<string>();
  const queries = {
    hasWork: vi.fn(async () => true),
    recoverStale: vi.fn(async () => 0),
    pendingIds: vi.fn(async () => [...rows].filter(([, r]) => r.status === 'pending').map(([id]) => id)),
    claim: vi.fn(async (id: string) => {
      const r = rows.get(id);
      if (r?.status !== 'pending') return null;
      r.status = 'rendering';
      return r.version;
    }),
    finish: vi.fn(async (f: Finish) => {
      const r = rows.get(f.id);
      if (r?.status !== 'rendering' || r.version !== f.version) return false;
      r.status = f.status;
      return true;
    }),
    queueMessage: vi.fn(async (m: { dedup_key: string }) => {
      sent.add(m.dedup_key);
    }),
  };
  const publisher = {
    publish: vi.fn(async (id: string) => ({ path: `s/${id}.pdf`, message: { dedup_key: `report_ready:${id}` } })),
    close: vi.fn(async () => undefined),
  };
  const rules: FakePolicyInput = { fail: true };
  const job = new ReportPdfJob(
    queries as unknown as ReportPdfQueries,
    publisher as unknown as ReportPdfPublisher,
    new NotificationPolicy(fakeRulesReader(rules)),
  );
  job.wait = vi.fn(async () => undefined);
  return { rows, sent, queries, publisher, rules, job };
}

describe('ReportPdfJob — unread rules hold the report (never failed, never sent while unread)', () => {
  it('unread: the claimed version goes back to pending, not failed, with no message and no retry backoff', async () => {
    const w = world();
    const summary = await w.job.runOnce(NOW);
    expect(summary).toEqual({ recovered: 0, rendered: 0, failed: 0, skipped: 0, held: 1 });
    expect(w.queries.finish).toHaveBeenCalledWith({ id: 'r1', version: 1, status: 'pending' });
    expect(w.queries.finish).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
    expect(w.rows.get('r1')?.status).toBe('pending');
    expect(w.queries.queueMessage).not.toHaveBeenCalled();
    expect(w.publisher.publish).toHaveBeenCalledTimes(1);
    expect(w.job.wait).not.toHaveBeenCalled();
    expect(w.publisher.close).toHaveBeenCalledTimes(1);
  });

  it('a later run, once the rules read, renders it, queues the message once and marks it ready', async () => {
    const w = world();
    await w.job.runOnce(NOW);
    await w.job.runOnce(NOW);
    w.rules.fail = false;
    const summary = await w.job.runOnce(NOW);
    expect(summary).toEqual({ recovered: 0, rendered: 1, failed: 0, skipped: 0, held: 0 });
    expect(w.rows.get('r1')?.status).toBe('ready');
    expect(w.queries.queueMessage).toHaveBeenCalledTimes(1);
    expect([...w.sent]).toEqual(['report_ready:r1']);
    await expect(w.job.runOnce(NOW)).resolves.toEqual({ recovered: 0, rendered: 0, failed: 0, skipped: 0, held: 0 });
    expect(w.queries.queueMessage).toHaveBeenCalledTimes(1);
  });

  it('a resubmit during a held render (version changed) is left to its own pending row', async () => {
    const w = world();
    w.publisher.publish.mockImplementationOnce(async (id: string) => {
      w.rows.set(id, { status: 'pending', version: 2 });
      return { path: `s/${id}.pdf`, message: { dedup_key: `report_ready:${id}` } };
    });
    await w.job.runOnce(NOW);
    expect(w.rows.get('r1')).toEqual({ status: 'pending', version: 2 });
  });
});
