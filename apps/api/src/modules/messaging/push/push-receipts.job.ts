import {
  Inject, Injectable, Logger, type OnApplicationBootstrap, type BeforeApplicationShutdown,
} from '@nestjs/common';
import { stopWithin, Ticker } from '@/common/jobs';
import { readReceipts, type ExpoReceipt } from './push-receipts';
import { PushReceiptsRepo, type TicketRow } from './push-receipts.repo';
import { RECEIPTS_TRANSPORT, type ReceiptsTransport } from './receipts.transport';
import { BackgroundJob } from '@/config/role/background-job';

const MINUTE = 60_000;
const EVERY_MS = 15 * MINUTE;
const FIRST_RUN_MS = 2 * MINUTE;
/** Expo: check receipts 15 minutes after sending … */
const RECEIPT_DELAY_MS = 15 * MINUTE;
/** … they are cleared after 24 hours. */
const RECEIPT_TTL_MS = 24 * 60 * MINUTE;

type ReceiptsSummary = { rows: number; settled: number; pruned: number };

/**
 * R-MOB-01 push receipts (completes common/push, which prunes on ticket errors): every 15 minutes,
 * the tickets of pushes sent 15 min – 24 h ago are looked up at Expo. A DeviceNotRegistered
 * receipt deletes the session binding of the token its ticket went to (ticket_tokens: an FCM
 * receipt names no token), the first receipt error is recorded, and checked tickets leave
 * ticket_ids and ticket_tokens so the next run skips them.
 */
@BackgroundJob({ name: 'push-receipts' })
@Injectable()
export class PushReceiptsJob implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly log = new Logger(PushReceiptsJob.name);
  private readonly ticker = new Ticker({
    name: PushReceiptsJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: PushReceiptsRepo,
    @Inject(RECEIPTS_TRANSPORT) private readonly transport: ReceiptsTransport,
  ) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  async beforeApplicationShutdown(): Promise<void> {
    await stopWithin(this.ticker);
  }

  /** One pass. Never throws. */
  async runOnce(now = new Date()): Promise<ReceiptsSummary> {
    const summary: ReceiptsSummary = { rows: 0, settled: 0, pruned: 0 };
    try {
      const to = new Date(now.getTime() - RECEIPT_DELAY_MS);
      const rows = await this.queries.unchecked({ from: new Date(now.getTime() - RECEIPT_TTL_MS), to });
      summary.rows = rows.length;
      if (rows.length === 0) return summary;
      const receipts = await this.transport(rows.flatMap((r) => r.ticket_ids));
      const done = new Set<string>();
      for (const row of rows) {
        const tokens = await this.settle(row, receipts);
        if (tokens === null) continue;
        summary.settled += 1;
        summary.pruned += await this.prune(row, tokens, done);
      }
    } catch (e) {
      this.log.warn(`push receipts run aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (summary.settled > 0) this.log.log(`push receipts: ${JSON.stringify(summary)}`);
    return summary;
  }

  /** Records what Expo answered for one row; its dead tokens, or null when no receipt is in yet. */
  private async settle(row: TicketRow, receipts: Readonly<Record<string, ExpoReceipt>>): Promise<string[] | null> {
    const outcome = readReceipts(row.ticket_ids, receipts, row.ticket_tokens);
    if (outcome.pending.length === row.ticket_ids.length) return null;
    await this.queries.settle(row.id, {
      ticket_ids: outcome.pending,
      ticket_tokens: outcome.pendingTokens,
      error: row.error ?? outcome.error,
    });
    return outcome.deadTokens;
  }

  /**
   * A token two rows went to is deleted once per run. Only a token actually deleted is done: one
   * the created_at guard kept for an older row is tried again for a newer row.
   */
  private async prune(row: TicketRow, dead: readonly string[], done: Set<string>): Promise<number> {
    const fresh = dead.filter((t) => !done.has(t));
    if (fresh.length === 0) return 0;
    const deleted = await this.queries.prune(row, fresh);
    for (const t of deleted) done.add(t);
    return deleted.length;
  }
}
