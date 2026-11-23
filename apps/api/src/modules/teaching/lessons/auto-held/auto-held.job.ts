import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type BeforeApplicationShutdown,
} from '@nestjs/common';
import { stopWithin, Ticker } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';
import { AutoHeldService, type AutoHeldSummary } from './auto-held.service';

const MINUTE = 60_000;

/** The pass held or marked absent at least one lesson. */
const wroteAny = (s: AutoHeldSummary): boolean => s.held + s.absent > 0;

/**
 * Every 10 minutes (the first pass 7 minutes after boot: every API test boots AppModule), the job
 * as actor null: AutoHeldService.runOnce. Idempotent per lesson (compare-and-set on its status).
 */
@BackgroundJob({ name: 'lessons-auto-held' })
@Injectable()
export class AutoHeldJob implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly log = new Logger(AutoHeldJob.name);
  private readonly ticker = new Ticker({
    name: AutoHeldJob.name,
    firstMs: 7 * MINUTE,
    everyMs: 10 * MINUTE,
    run: () => this.runOnce(),
  });

  constructor(private readonly held: AutoHeldService) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await stopWithin(this.ticker);
  }

  /** One pass. Never throws. */
  async runOnce(now = new Date()): Promise<AutoHeldSummary | null> {
    try {
      const summary = await this.held.runOnce(now);
      if (wroteAny(summary)) this.log.log(`lesson outcomes: ${JSON.stringify(summary)}`);
      return summary;
    } catch (e) {
      this.log.error(`auto-held pass aborted: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
}
