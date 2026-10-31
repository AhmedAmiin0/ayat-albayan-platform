import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ClientUsageCounter, usageSummary, type UsageHit } from './client-usage.counter';

export const USAGE_LOG_EVERY_MS = 15 * 60_000;

/**
 * Counts API hits per route × client build (X-AB-Client) and logs one summary line every 15 minutes,
 * then resets (docs/26 §2f: an alias goes only after 30 days with zero untagged / old-build hits).
 * In memory only: a restart loses at most one window. The timer is unref'd and cleared on shutdown.
 */
@Injectable()
export class ClientUsageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('ClientUsage');
  private readonly counter = new ClientUsageCounter();
  private timer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    this.timer = setInterval(() => this.flush(), USAGE_LOG_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.flush();
  }

  hit(h: UsageHit): void {
    this.counter.hit(h);
  }

  /** Logs the window's summary (if any hit) and resets. */
  flush(): void {
    const line = usageSummary(this.counter.drain());
    if (line) this.logger.log(line);
  }
}
