import type { BeforeApplicationShutdown, OnApplicationBootstrap } from '@nestjs/common';
import type { Ticker } from '@/common/jobs/ticker';
import { stopWithin } from './stop-within';

/** A job driven by one Ticker: timers on boot, a bounded wait for its run on shutdown (BE-14). */
export abstract class TickerJob implements OnApplicationBootstrap, BeforeApplicationShutdown {
  protected abstract readonly ticker: Ticker;

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  beforeApplicationShutdown(): Promise<unknown> {
    return stopWithin(this.ticker);
  }
}
