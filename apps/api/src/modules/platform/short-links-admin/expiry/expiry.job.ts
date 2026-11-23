import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type BeforeApplicationShutdown,
  Inject,
} from '@nestjs/common';
import { stopWithin, Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import { LinkExpiry } from './expiry.service';

const MINUTE = 60_000;

/**
 * The managed links' cron (docs/19): every 15 minutes the expired links are stopped, once a day
 * the old ones are deleted. Not at boot (every API test boots AppModule). Idempotent by cutoff.
 * ponytail: in-process Ticker like ActivityRetentionJob (pg_cron is not enabled in this project).
 */
@BackgroundJob({ name: 'short-link-expiry' })
@Injectable()
export class LinkExpiryJob implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly log = new Logger(LinkExpiryJob.name);
  private readonly tickers = [
    new Ticker({
      name: 'ShortLinkExpire',
      firstMs: 9 * MINUTE,
      everyMs: 15 * MINUTE,
      run: () => this.expireOnce(),
    }),
    new Ticker({
      name: 'ShortLinkPurge',
      firstMs: 21 * MINUTE,
      everyMs: 1_440 * MINUTE,
      run: () => this.purgeOnce(),
    }),
  ];

  constructor(@Inject(LinkExpiry) private readonly expiry: LinkExpiry) {}

  onApplicationBootstrap(): void {
    this.tickers.forEach((t) => t.start());
  }

  async beforeApplicationShutdown(): Promise<void> {
    await Promise.all(this.tickers.map((t) => stopWithin(t)));
  }

  /** Never throws; the number of links stopped. */
  expireOnce(now = new Date()): Promise<number> {
    return this.safely('expire', () => this.expiry.expire(now));
  }

  /** Never throws; the number of links deleted. */
  purgeOnce(now = new Date()): Promise<number> {
    return this.safely('purge', () => this.expiry.purge(now));
  }

  private async safely(step: string, run: () => Promise<number>): Promise<number> {
    try {
      return await run();
    } catch (e) {
      this.log.error(`short link ${step} failed: ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    }
  }
}
