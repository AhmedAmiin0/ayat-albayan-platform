import {
  Inject, Injectable, type OnApplicationBootstrap, type BeforeApplicationShutdown,
} from '@nestjs/common';
import { stopWithin, Ticker } from '@/common/jobs';
import type { BeatBook } from '@/common/jobs/beats';
import { BackgroundJob } from '@/config/role/background-job';
import { StaleAlerts } from './stale-alerts';

export const WATCH_EVERY_MS = 60_000;
/** Soon after boot, not at once: every API test boots AppModule. */
export const WATCH_FIRST_MS = 30_000;
/** The worker's own book and the server clock (jobBeats and Date.now; fakes in tests). */
interface WatchSource {
  book: Pick<BeatBook, 'list'>;
  now: () => number;
}
export const WATCH_SOURCE = Symbol('WATCH_SOURCE');

/** Every minute in the worker: a job whose last success is too old raises one admin bell alert. */
@BackgroundJob({ name: 'job-watch' })
@Injectable()
export class JobWatchJob implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly ticker = new Ticker({
    name: JobWatchJob.name,
    firstMs: WATCH_FIRST_MS,
    everyMs: WATCH_EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
    @Inject(StaleAlerts) private readonly alerts: StaleAlerts,
    @Inject(WATCH_SOURCE) private readonly source: WatchSource,
  ) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await stopWithin(this.ticker);
  }

  runOnce(): Promise<void> {
    return this.alerts.check(this.source.book.list(), this.source.now());
  }
}
