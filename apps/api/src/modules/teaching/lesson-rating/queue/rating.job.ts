import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { LessonEvents } from '../../../../common/events/lesson-events';
import { Ticker } from '../../../messaging/reminders/ticker';
import { RATING_LOOKBACK_MS } from '../rating.plan';
import { RatingQueries } from '../rating.queries';
import { RatingQueue, type QueueResult } from './rating.queue';
import { BackgroundJob } from '../../../../config/role/background-job';

const MINUTE = 60_000;

/**
 * «تقييم الحلقة» after a lesson (owner 2026-10-05, migration 195). Right after a lesson is marked
 * completed / late (LessonEvents, after the commit), and every 5 minutes as the catch-up sweep over
 * the last 36 h (a missed event, the switch turned on later, the template approved later). Both
 * paths are idempotent through the dedup key lesson_rating:{lesson}:{guardian} (rule 8).
 */
@BackgroundJob({ name: 'lesson-rating' })
@Injectable()
export class RatingJob implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(RatingJob.name);
  private readonly ticker = new Ticker({ name: RatingJob.name, firstMs: 45_000, everyMs: 5 * MINUTE, run: () => this.runOnce() });

  constructor(
    private readonly queue: RatingQueue,
    private readonly queries: RatingQueries,
    private readonly events: LessonEvents,
  ) {}

  onModuleInit(): void {
    this.events.onChanged((ids) => this.onLessons(ids).then(() => undefined));
  }

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
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
