import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { Ticker, TickerJob } from '@/common/jobs';
import { RATING_LOOKBACK_MS } from '@/modules/teaching/lesson-rating/rating.plan';
import { RatingRepo } from '@/modules/teaching/lesson-rating/rating.repo';
import { RatingQueue, type QueueResult } from './rating.queue';
import { BackgroundJob } from '@/config/role/background-job';

const MINUTE = 60_000;

/** Event plus a 5-minute catch-up over 36 h; idempotent via its dedup key (rule 8). */
@BackgroundJob({ name: 'lesson-rating' })
@Injectable()
export class RatingJob extends TickerJob implements OnModuleInit {
  private readonly log = new Logger(RatingJob.name);
  protected readonly ticker = new Ticker({
    name: RatingJob.name,
    firstMs: 45_000,
    everyMs: 5 * MINUTE,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queue: RatingQueue,
    private readonly queries: RatingRepo,
    private readonly events: LessonEvents,
  ) {
    super();
  }

  onModuleInit(): void {
    this.events.onChanged((ids) => this.onLessons(ids).then(() => undefined));
  }

  /** The sweep. Never throws. */
  async runOnce(now = new Date()): Promise<QueueResult | null> {
    const since = new Date(now.getTime() - RATING_LOOKBACK_MS);
    return this.safely(() => this.queue.queue(() => this.queries.held({ since, until: now }), now));
  }

  /** Lessons whose outcome just changed; the plan keeps those that took place. Never throws. */
  async onLessons(ids: readonly string[], now = new Date()): Promise<QueueResult | null> {
    return this.safely(() => this.queue.queue(() => this.queries.byIds(ids), now));
  }

  private async safely(run: () => Promise<QueueResult>): Promise<QueueResult | null> {
    try {
      const result = await run();
      if (result.queued > 0) this.log.log(`lesson ratings queued: ${result.queued}`);
      return result;
    } catch (e) {
      this.log.error(`lesson rating run failed: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
}
