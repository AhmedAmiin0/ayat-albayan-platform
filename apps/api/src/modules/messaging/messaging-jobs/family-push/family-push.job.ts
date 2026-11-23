import { Inject, Injectable, Logger } from '@nestjs/common';
import { Ticker, TickerJob } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import { FamilyPushService, type FamilyPushSummary } from './family-push.service';

const MINUTE = 60_000;

/**
 * Every minute (the first pass 2 minutes after boot: every API test boots AppModule), the family
 * app's pushes: FamilyPushService.runOnce. Idempotent: PushService's dedup key per kind, subject
 * and profile, so a second worker or a retried pass sends nothing twice (rule 8).
 */
@BackgroundJob({ name: 'family-push' })
@Injectable()
export class FamilyPushJob extends TickerJob {
  private readonly log = new Logger(FamilyPushJob.name);
  protected readonly ticker = new Ticker({
    name: FamilyPushJob.name,
    firstMs: 2 * MINUTE,
    everyMs: MINUTE,
    run: () => this.runOnce(),
  });

  constructor(@Inject(FamilyPushService) private readonly family: FamilyPushService) {
    super();
  }

  /** One pass. Never throws. */
  async runOnce(now = new Date()): Promise<FamilyPushSummary | null> {
    try {
      return await this.family.runOnce(now);
    } catch (e) {
      this.log.error(`family push pass aborted: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
}
