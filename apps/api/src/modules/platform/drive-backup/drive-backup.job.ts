import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { BackgroundJob } from '@/config/role/background-job';
import { msUntilUtcHour } from './plan/labels';
import { DriveBackupRunner, type RunOutcome } from './drive-backup.runner';

/** 01:00 UTC = 04:00 Riyadh: the quiet hour, before the Google sync's 02:00 UTC reconcile. */
const RUN_UTC_HOUR = 1;
/**
 * A run that hangs (a stalled stream) is aborted after this: its MinIO requests and the part's
 * pipeline get the abort (memory and sockets freed), and the next night runs again.
 */
const RUN_DEADLINE_MS = 8 * 3_600_000;

/** Resolves `failed` once the signal aborts (whether or not the run itself has stopped yet). */
const aborted = (signal: AbortSignal): Promise<'failed'> =>
  new Promise((resolve) => signal.addEventListener('abort', () => resolve('failed')));

/**
 * The MinIO → Drive backup worker (docs/45 §5): once a night in the worker process (the Google
 * sync's pattern: in-process, single-flight, timers unref'd); `kick` runs it now (tests, a retry).
 */
@BackgroundJob({ name: 'drive-backup', kick: 'kick' })
@Injectable()
export class DriveBackupJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(DriveBackupJob.name);
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<RunOutcome> | null = null;

  constructor(private readonly runner: DriveBackupRunner) {}

  onApplicationBootstrap(): void {
    const nightly = () => {
      void this.kick();
      this.timer = setTimeout(nightly, msUntilUtcHour(new Date(), RUN_UTC_HOUR)).unref();
    };
    this.timer = setTimeout(nightly, msUntilUtcHour(new Date(), RUN_UTC_HOUR)).unref();
  }

  onModuleDestroy(): void {
    clearTimeout(this.timer ?? undefined);
  }

  /** Runs now; a kick during a run joins it. Never throws. */
  kick(deadlineMs = RUN_DEADLINE_MS): Promise<RunOutcome> {
    this.running ??= this.guarded(deadlineMs).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  /** One run with its own AbortController, aborted at the deadline. */
  private async guarded(deadlineMs: number): Promise<RunOutcome> {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(new Error('run_deadline')), deadlineMs).unref();
    try {
      const run = this.runner.runOnce({ signal: stop.signal });
      return await Promise.race([run, aborted(stop.signal)]);
    } catch (e) {
      this.log.warn(`drive backup run failed: ${e instanceof Error ? e.message : String(e)}`);
      return 'failed';
    } finally {
      clearTimeout(timer);
    }
  }
}
