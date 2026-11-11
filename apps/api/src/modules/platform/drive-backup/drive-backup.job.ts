import { setTimeout as sleep } from 'node:timers/promises';
import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { BackgroundJob } from '@/config/role/background-job';
import { msUntilUtcWeekly } from './plan/labels';
import { DriveBackupRunner, type RunOutcome } from './drive-backup.runner';

/**
 * Once a week (owner 2026-11-11): Friday 01:00 UTC = Friday 04:00 Riyadh, the quiet hour of the
 * weekend, before the Google sync's 02:00 UTC reconcile.
 */
const RUN_AT = { weekday: 5, hour: 1 };
/**
 * A run that hangs (a stalled stream) is aborted after this: its MinIO and Drive requests, the
 * part's pipeline and the upload's waits get the abort (memory and sockets freed).
 */
const RUN_DEADLINE_MS = 8 * 3_600_000;
/**
 * After the abort, the run's own end is awaited this long before another run may start: two runs
 * never overlap (a second one would abandon the first one's row while it still uploads).
 */
const SETTLE_MS = 10 * 60_000;

interface Limits {
  deadlineMs: number;
  settleMs: number;
}

/** Resolves `failed` once the signal aborts (whether or not the run itself has stopped yet). */
const aborted = (signal: AbortSignal): Promise<'failed'> =>
  new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve('failed'), { once: true });
  });

/**
 * The MinIO → Drive backup worker (docs/45 §5): once a week in the worker process (the Google
 * sync's pattern: in-process, single-flight, timers unref'd); `kick` runs it now (tests, a retry).
 */
@BackgroundJob({ name: 'drive-backup', kick: 'kick' })
@Injectable()
export class DriveBackupJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(DriveBackupJob.name);
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<RunOutcome> | null = null;

  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(DriveBackupRunner) private readonly runner: DriveBackupRunner) {}

  onApplicationBootstrap(): void {
    const weekly = () => {
      void this.kick();
      this.timer = setTimeout(weekly, msUntilUtcWeekly(new Date(), RUN_AT)).unref();
    };
    this.timer = setTimeout(weekly, msUntilUtcWeekly(new Date(), RUN_AT)).unref();
  }

  onModuleDestroy(): void {
    clearTimeout(this.timer ?? undefined);
  }

  /** Runs now; a kick during a run (or while an aborted one winds down) joins it. Never throws. */
  kick(limits: Partial<Limits> = {}): Promise<RunOutcome> {
    const all = { deadlineMs: RUN_DEADLINE_MS, settleMs: SETTLE_MS, ...limits };
    this.running ??= this.guarded(all).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** One run with its own AbortController, aborted at the deadline, then awaited (bounded). */
  private async guarded(limits: Limits): Promise<RunOutcome> {
    const stop = new AbortController();
    const timer = setTimeout(
      () => stop.abort(new Error('run_deadline')),
      limits.deadlineMs,
    ).unref();
    const run = this.runner.runOnce({ signal: stop.signal }).catch((e: unknown) => this.crashed(e));
    try {
      const outcome = await Promise.race([run, aborted(stop.signal)]);
      if (stop.signal.aborted) await this.settled(run, limits.settleMs);
      return outcome;
    } finally {
      clearTimeout(timer);
    }
  }

  /** The aborted run's end, or the bound (then logged: the run is left to finish on its own). */
  private async settled(run: Promise<RunOutcome>, ms: number): Promise<void> {
    const late = sleep(ms, 'late' as const, { ref: false });
    if ((await Promise.race([run, late])) === 'late') this.log.warn('drive backup run still busy');
  }

  private crashed(e: unknown): RunOutcome {
    this.log.warn(`drive backup run failed: ${e instanceof Error ? e.message : String(e)}`);
    return 'failed';
  }
}
