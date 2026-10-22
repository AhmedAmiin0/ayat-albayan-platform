import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { loadEnv } from '../../env';
import { GoogleItemsQueries } from './google-items.queries';
import { GoogleSyncProcessor } from './google-sync.processor';

const POLL_MS = 60_000;
/** Soon after boot, not at once: every API test boots AppModule (as HorizonJob notes). */
const FIRST_RUN_MS = 45_000;
const DAY_MS = 86_400_000;
/** 05:00 Asia/Riyadh (UTC+3, no DST) = 02:00 UTC. */
const RECONCILE_UTC_HOUR = 2;

/** ms from `now` to the next 02:00 UTC. */
export function msUntilReconcile(now: Date): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), RECONCILE_UTC_HOUR);
  return next > now.getTime() ? next - now.getTime() : next + DAY_MS - now.getTime();
}

/**
 * The Google sync worker (docs/24 §3): drains the outbox every minute (GOOGLE_SYNC_POLL_MS in e2e)
 * and after a kick (an admin action), and re-queues the window's platform lessons daily at 05:00
 * Riyadh. ponytail: in-process and single-flight like ReportPdfJob, not pg-boss: the claim is a
 * row-locked compare-and-set with a token, so a second API instance only shares the work.
 */
@Injectable()
export class GoogleSyncJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(GoogleSyncJob.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private running: Promise<void> | null = null;
  private again = false;

  constructor(
    private readonly processor: GoogleSyncProcessor,
    private readonly items: GoogleItemsQueries,
  ) {}

  onApplicationBootstrap(): void {
    const every = loadEnv().GOOGLE_SYNC_POLL_MS ?? POLL_MS;
    const tick = () => void this.kick();
    this.timers.push(setTimeout(tick, Math.min(FIRST_RUN_MS, every)).unref(), setInterval(tick, every).unref());
    const daily = () => {
      void this.reconcile();
      this.timers.push(setTimeout(daily, msUntilReconcile(new Date())).unref());
    };
    this.timers.push(setTimeout(daily, msUntilReconcile(new Date())).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Re-queue the window (idempotent: an unchanged item is a no-op), then drain. Never throws. */
  async reconcile(): Promise<number> {
    try {
      const n = await this.items.reconcile();
      void this.kick();
      return n;
    } catch (e) {
      this.log.warn(`google reconcile failed: ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    }
  }

  /** Run now; a kick during a run queues one more pass. Loops while a pass was full. */
  kick(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    const loop = async () => {
      do {
        this.again = false;
        try {
          const s = await this.processor.runOnce();
          if (s.claimed >= 25 && !s.stopped) this.again = true;
        } catch (e) {
          this.log.warn(`google sync pass failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      } while (this.again);
    };
    this.running = loop().finally(() => {
      this.running = null;
    });
    return this.running;
  }
}
