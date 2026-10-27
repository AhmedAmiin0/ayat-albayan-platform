import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { RecordingRetention } from './recording-retention';
import { BackgroundJob } from '../../../../config/role/background-job';

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
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(private readonly retention: RecordingRetention) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, EVERY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
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
