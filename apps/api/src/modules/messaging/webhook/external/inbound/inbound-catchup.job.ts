import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { BackgroundJob } from '@/config/role/background-job';
import { Ticker } from '@/modules/messaging/reminders';
import { EVERY_MS } from '@/modules/messaging/webhook/external/external-catchup.job';
import { kapsoChatNumbers } from '@/modules/messaging/webhook/external/kapso-numbers';
import { InboundCatchUp, type InboundCounts } from './inbound-catchup.service';
import { InboundGapAlert } from './inbound-gap.alert';

/** Not on boot (every API test boots AppModule); a minute after the outbound catch-up's first. */
const FIRST_RUN_MS = 3 * 60_000;

/**
 * The inbound catch-up (incident 2026-10-30): every 10 minutes like the outbound one, single flight
 * (Ticker), each enabled Kapso chat number in turn (InboundCatchUp). The first run of a process
 * reads the whole week (inboundSince `full`), so a deploy back-fills a gap even when the webhook
 * came back first. Stored messages older than LATE_MS raise InboundGapAlert. Never throws.
 */
@BackgroundJob({ name: 'inbound-catch-up' })
@Injectable()
export class InboundCatchUpJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(InboundCatchUpJob.name);
  private readonly ticker = new Ticker({
    name: InboundCatchUpJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });
  private full = true;

  constructor(
    private readonly catchUp: InboundCatchUp,
    private readonly alert: InboundGapAlert,
  ) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  async runOnce(now = new Date()): Promise<InboundCounts[]> {
    const full = this.full;
    this.full = false;
    const out: InboundCounts[] = [];
    for (const n of kapsoChatNumbers()) {
      const counts = await this.catchUp.number(n, { now, full });
      const late = { count: counts.late, now };
      if (late.count > 0) await this.raise(() => this.alert.raise(n, late));
      out.push(counts);
    }
    return out;
  }

  /** An alert failure is logged; the next number still runs. */
  private async raise(work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (e) {
      this.log.error(`inbound catch-up alert failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
