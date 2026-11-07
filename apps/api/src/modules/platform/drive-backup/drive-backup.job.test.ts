import { describe, expect, it, vi } from 'vitest';
import { DriveBackupJob } from './drive-backup.job';
import type { DriveBackupRunner, RunOutcome } from './drive-backup.runner';

// docs/45 §5.1: a stalled run is aborted at the deadline (its MinIO and Drive requests freed), and
// no second run starts while the aborted one still winds down (two runs never overlap).

const jobOf = (runOnce: (input: { signal?: AbortSignal }) => Promise<RunOutcome>) =>
  new DriveBackupJob({ runOnce } as unknown as DriveBackupRunner);

describe('DriveBackupJob deadline', () => {
  it('aborts the run’s signal and lets the job go as failed', async () => {
    let signal: AbortSignal | undefined;
    const job = jobOf((input) => {
      signal = input.signal;
      return new Promise<RunOutcome>(() => undefined); // a stalled stream
    });
    expect(await job.kick({ deadlineMs: 5, settleMs: 5 })).toBe('failed');
    expect(signal?.aborted).toBe(true);
  });

  it('after the abort, single-flight holds until the run has really ended', async () => {
    let end: (o: RunOutcome) => void = () => undefined;
    const runOnce = vi.fn((input: { signal?: AbortSignal }) => {
      const run = new Promise<RunOutcome>((resolve) => (end = resolve));
      input.signal?.addEventListener('abort', () => setTimeout(() => end('failed'), 30));
      return run;
    });
    const job = jobOf(runOnce);
    const first = job.kick({ deadlineMs: 5, settleMs: 10_000 });
    await new Promise((r) => setTimeout(r, 15)); // aborted, still winding down
    const second = job.kick();
    expect(second).toBe(first);
    expect(await first).toBe('failed');
    expect(runOnce).toHaveBeenCalledOnce();
  });

  it('a run that ends in time keeps its outcome; a kick during it joins it', async () => {
    const job = jobOf(() => Promise.resolve('ran' as const));
    const [a, b] = await Promise.all([job.kick(), job.kick()]);
    expect([a, b]).toEqual(['ran', 'ran']);
  });

  it('a run that throws is a failed night, never a thrown kick', async () => {
    const job = jobOf(() => Promise.reject(new Error('boom')));
    expect(await job.kick()).toBe('failed');
  });
});
