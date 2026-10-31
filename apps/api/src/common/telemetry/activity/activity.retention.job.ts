import { Inject, Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { BackgroundJob } from '@/config/role/background-job';

const EVERY_MS = 24 * 3_600_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 15 * 60_000;

/**
 * Activity log retention: once a day, prune_activity_log() deletes rows older than 180 days.
 * Idempotent (deleting by cutoff twice deletes nothing more). ponytail: in-process timer like
 * ExpensesJob; pg_cron is not enabled in this project.
 */
@BackgroundJob({ name: 'activity-retention' })
@Injectable()
export class ActivityRetentionJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(ActivityRetentionJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(@Inject(DB) private readonly db: Db) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, EVERY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Never throws; the number of rows deleted. */
  async runOnce(): Promise<number> {
    try {
      const { data, error } = await this.db.rpc('prune_activity_log');
      if (error) throw new Error(error.message);
      return data;
    } catch (e) {
      this.log.error(`activity_log retention failed: ${String(e)}`);
      return 0;
    }
  }
}
