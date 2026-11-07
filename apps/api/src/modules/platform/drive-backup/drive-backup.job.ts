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
  kick(): Promise<RunOutcome> {
    this.running ??= this.runner
      .runOnce()
      .catch((e: unknown) => {
        this.log.warn(`drive backup run failed: ${e instanceof Error ? e.message : String(e)}`);
        return 'failed' as const;
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }
}
