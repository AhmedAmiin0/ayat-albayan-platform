import { localDateIn, wallToUtc } from '@ab/time';
import { errorMessage } from '@ab/core';
import { Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { GoogleItemsQueries } from './google-items.queries';
import { GoogleSyncProcessor } from './google-sync.processor';
import { BackgroundJob } from '@/config/role/background-job';
import { Ticker, TickerJob } from '@/common/jobs';

const POLL_MS = 60_000;
/** Soon after boot, not at once: every API test boots AppModule (as HorizonJob notes). */
const FIRST_RUN_MS = 45_000;
const DAY_MS = 86_400_000;
/** A pass that claimed a full batch may have left more: drain again at once. */
const BATCH = 25;
/** 05:00 Asia/Riyadh (UTC+3, no DST) = 02:00 UTC. */
const RECONCILE_UTC_HOUR = 2;

/** ms from `now` to the next 02:00 UTC. */
export function msUntilReconcile(now: Date): number {
  const today = localDateIn(now, 'UTC');
  const next = wallToUtc(today, RECONCILE_UTC_HOUR * 60, 'UTC').getTime();
  return next > now.getTime() ? next - now.getTime() : next + DAY_MS - now.getTime();
}

/**
 * The Google sync worker (docs/24 §3): drains the outbox every minute (GOOGLE_SYNC_POLL_MS in e2e)
 * and after a kick (an admin action), and re-queues the window's platform lessons daily at 05:00
 * Riyadh. ponytail: in-process and single-flight like ReportPdfJob, not pg-boss: the claim is a
 * row-locked compare-and-set with a token, so a second API instance only shares the work.
 */
@BackgroundJob({ name: 'google-sync', kick: 'kick' })
@Injectable()
export class GoogleSyncJob extends TickerJob {
  private readonly log = new Logger(GoogleSyncJob.name);
  protected readonly ticker = new Ticker({
    name: GoogleSyncJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: POLL_MS,
    run: () => this.drain(),
    timer: 'kick',
  });
  /** The daily reconcile: a wall-clock time, which a fixed interval cannot express. */
  private daily: NodeJS.Timeout | null = null;

  constructor(
    private readonly processor: GoogleSyncProcessor,
    private readonly items: GoogleItemsQueries,
  ) {
    super();
  }

  override onApplicationBootstrap(): void {
    const everyMs = loadEnv().GOOGLE_SYNC_POLL_MS ?? POLL_MS;
    this.ticker.start({ firstMs: Math.min(FIRST_RUN_MS, everyMs), everyMs });
    this.planReconcile();
  }

  override beforeApplicationShutdown(): Promise<unknown> {
    clearTimeout(this.daily ?? undefined);
    return super.beforeApplicationShutdown();
  }

  /** Re-queue the window (idempotent: an unchanged item is a no-op), then drain. Never throws. */
  async reconcile(): Promise<number> {
    try {
      const n = await this.items.reconcile();
      void this.kick();
      return n;
    } catch (e) {
      this.log.warn(`google reconcile failed: ${errorMessage(e)}`);
      return 0;
    }
  }

  /** Run now; a kick during a run queues one more pass. */
  kick(): Promise<void> {
    return this.ticker.kick();
  }

  private planReconcile(): void {
    const next = () => {
      void this.reconcile();
      this.planReconcile();
    };
    this.daily = this.ticker.stopping ? null : setTimeout(next, msUntilReconcile(new Date())).unref();
  }

  /** Passes until one was not full or was stopped (a lost grant); a failed pass is logged. */
  private async drain(): Promise<void> {
    const full = (s: { claimed: number; stopped: boolean }) => s.claimed >= BATCH && !s.stopped;
    let more = true;
    while (more && !this.ticker.stopping) {
      more = await this.processor.runOnce().then(full, (e: unknown) => this.passFailed(e));
    }
  }

  private passFailed(e: unknown): boolean {
    this.log.warn(`google sync pass failed: ${errorMessage(e)}`);
    return false;
  }
}
