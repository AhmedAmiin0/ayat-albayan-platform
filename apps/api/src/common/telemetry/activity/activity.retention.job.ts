import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { Ticker, TickerJob } from '@/common/jobs';
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
export class ActivityRetentionJob extends TickerJob {
  private readonly log = new Logger(ActivityRetentionJob.name);
  protected readonly ticker = new Ticker({
    name: ActivityRetentionJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(@Inject(DB) private readonly db: Db) {
    super();
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
