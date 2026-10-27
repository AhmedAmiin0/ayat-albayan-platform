import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakePolicy } from '../../messaging/notification-rules/policy/policy.fakes';
import { ReportPdfJob } from './report-pdf.job';
import type { ReportPdfPublisher } from './report-pdf.publisher';
import type { ReportPdfQueries } from './report-pdf.queries';

function job() {
  const queries = {
    hasWork: vi.fn(async () => true),
    recoverStale: vi.fn(async () => 0),
    pendingIds: vi.fn(async () => [] as string[]),
  };
  const j = new ReportPdfJob(queries as unknown as ReportPdfQueries, {} as ReportPdfPublisher, fakePolicy());
  return { j, queries };
}

describe('ReportPdfJob — scheduling and single flight', () => {
  afterEach(() => vi.useRealTimers());

  it('kick during a run shares it and queues exactly one more run', async () => {
    const { j } = job();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((done) => {
      release = done;
    });
    const run = vi.spyOn(j, 'runOnce').mockImplementationOnce(async () => {
      await gate;
      return { recovered: 0, rendered: 0, failed: 0, skipped: 0, held: 0 };
    });
    const first = j.kick();
    const second = j.kick();
    const third = j.kick();
    expect(second).toBe(first);
    expect(third).toBe(first);
    release();
    await first;
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('a kick after the run finished starts a new run', async () => {
    const { j, queries } = job();
    await j.kick();
    await j.kick();
    expect(queries.pendingIds).toHaveBeenCalledTimes(2);
  });

  it('first run 30 s after boot, then every minute; destroy stops the timers', async () => {
    vi.useFakeTimers();
    const { j, queries } = job();
    j.onApplicationBootstrap();
    await vi.advanceTimersByTimeAsync(29_000);
    expect(queries.pendingIds).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(queries.pendingIds).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(queries.pendingIds).toHaveBeenCalledTimes(2);
    j.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(queries.pendingIds).toHaveBeenCalledTimes(2);
  });
});
