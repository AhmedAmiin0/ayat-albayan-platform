import { describe, expect, it } from 'vitest';
import { DriveBackupJob } from './drive-backup.job';
import type { DriveBackupRunner, RunOutcome } from './drive-backup.runner';

// docs/45 §5.1: a stalled run is aborted at the deadline (its MinIO reads and pipeline freed).

describe('DriveBackupJob deadline', () => {
  it('aborts the run’s signal and lets the job go as failed', async () => {
    let signal: AbortSignal | undefined;
    const runner = {
      runOnce: (input: { signal?: AbortSignal }) => {
        signal = input.signal;
        return new Promise<RunOutcome>(() => undefined); // a stalled stream
      },
    } as unknown as DriveBackupRunner;
    const job = new DriveBackupJob(runner);
    expect(await job.kick(5)).toBe('failed');
    expect(signal?.aborted).toBe(true);
  });

  it('a run that ends in time keeps its outcome; a kick during it joins it', async () => {
    const runner = { runOnce: () => Promise.resolve('ran' as const) };
    const job = new DriveBackupJob(runner as unknown as DriveBackupRunner);
    const [a, b] = await Promise.all([job.kick(), job.kick()]);
    expect([a, b]).toEqual(['ran', 'ran']);
  });
});
