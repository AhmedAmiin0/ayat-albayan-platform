import { describe, expect, it, vi } from 'vitest';
import { fakeDb } from '../../people/guardians/fake-db';
import { fakePolicy } from '../../messaging/notification-rules/policy/policy.fakes';
import { ReportPdfJob } from './report-pdf.job';
import type { ReportPdfPublisher } from './report-pdf.publisher';
import { ReportPdfQueries } from './report-pdf.queries';

const T = 'lesson_reports';
const publisher = { publish: vi.fn(), close: vi.fn(async () => undefined) } as unknown as ReportPdfPublisher;

/** The real queries on a counting fake db: every awaited query is one PostgREST round trip. */
function setup(results: Parameters<typeof fakeDb>[0]) {
  const fake = fakeDb(results);
  return { ...fake, job: new ReportPdfJob(new ReportPdfQueries(fake.db), publisher, fakePolicy()) };
}

describe('ReportPdfJob — an idle tick (owner 2026-10-27: lesson_reports read twice a minute)', () => {
  it('nothing pending or rendering: ONE round trip (was 2: the stale-recovery update + the pending read)', async () => {
    const { job, trips, argsOf } = setup({ [T]: [{ data: [] }] });
    await expect(job.runOnce()).resolves.toEqual({ recovered: 0, rendered: 0, failed: 0, skipped: 0, held: 0 });
    expect(trips).toEqual([T]);
    expect(argsOf(T, 'in')).toEqual(['pdf_status', ['pending', 'rendering']]);
    expect(argsOf(T, 'limit')).toEqual([1]);
  });

  it('a row in the queue: the probe, then the pass exactly as before (recover, pending read)', async () => {
    const { job, trips } = setup({ [T]: [{ data: [{ id: 'r1' }] }, { data: [] }, { data: [] }] });
    await job.runOnce();
    expect(trips).toEqual([T, T, T]);
  });

  it('a failed probe is logged, never thrown', async () => {
    const { job } = setup({ [T]: [{ error: { message: 'down' } }] });
    await expect(job.runOnce()).resolves.toMatchObject({ rendered: 0 });
  });
});
