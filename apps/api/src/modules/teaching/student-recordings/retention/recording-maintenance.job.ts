import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { RecordingRetention } from './recording-retention';
import { Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';

const EVERY_MS = 3_600_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 20 * 60_000;

/**
 * Hourly: fails recordings stuck in `recording`, then applies the retention setting (off unless the
 * owner set `recording_retention_days`). In-process timer like ActivityRetentionJob (pg_cron is not
 * enabled in this project); both sweeps are idempotent, so overlapping API instances are harmless.
 */
@BackgroundJob({ name: 'recording-maintenance' })
@Injectable()
export class RecordingMaintenanceJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(RecordingMaintenanceJob.name);
  private readonly ticker = new Ticker({
    name: RecordingMaintenanceJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(private readonly retention: RecordingRetention) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  /** Never throws; how many rows each sweep changed. */
  async runOnce(now = new Date()): Promise<{ stuck: number; purged: number }> {
    const stuck = await this.attempt('stuck sweep', () => this.retention.sweepStuck(now));
    const purged = await this.attempt('retention', () => this.retention.purgeExpired(now));
    return { stuck, purged };
  }

  private async attempt(what: string, run: () => Promise<number>): Promise<number> {
    try {
      return await run();
    } catch (e) {
      this.log.error(`recordings ${what} failed: ${String(e)}`);
      return 0;
    }
  }
}
