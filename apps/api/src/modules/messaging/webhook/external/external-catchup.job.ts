import { Inject, Injectable, Logger } from '@nestjs/common';
import { Ticker, TickerJob } from '@/common/jobs';
import { field } from '@/modules/messaging/webhook/parse/webhook.fields';
import { KAPSO_HISTORY } from './external-status';
import { ExternalRepo } from './external.repo';
import { ExternalStore, type ExternalOutcome } from './external.store';
import { messageTime } from './external-message';
import { KapsoHistory } from './kapso-history';
import { kapsoChatNumbers, type KapsoNumber } from './kapso-numbers';
import { BackgroundJob } from '@/config/role/background-job';

export const EVERY_MS = 10 * 60_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 2 * 60_000;
/** Never before the chat import of 2026-10-25, which holds everything older. */
export const FLOOR = new Date('2026-10-25T00:00:00Z');
/**
 * Always re-read the last day: a message the webhook failed to fetch is older than the newest
 * stored one.
 */
export const LOOKBACK_MS = 24 * 3_600_000;
/** Pages per number per run (100 each); the rest waits for the next run. */
export const MAX_PAGES = 20;

type CatchUpCounts = Record<ExternalOutcome | 'listed', number>;

interface PagesRun {
  since: string;
  counts: CatchUpCounts;
  label: string;
}

/**
 * From the newest stored external message (none: FLOOR), or the last day when that is newer; never
 * before FLOOR.
 */
export function catchUpSince(newest: Date | null, now: Date): Date {
  if (!newest) return FLOOR;
  const back = new Date(now.getTime() - LOOKBACK_MS);
  const from = newest < back ? newest : back;
  return from < FLOOR ? FLOOR : from;
}

const timeOf = (m: unknown): number => messageTime(field(m, 'timestamp'))?.getTime() ?? 0;
/** The tail of an id for the log: never a phone number, a key or a body. */
const tail = (id: string): string => `…${id.slice(-4)}`;

/**
 * Messages staff sent outside the app (Kapso's inbox) whose webhook status was missed or could not
 * be read back: every 10 minutes, single flight (Ticker), for each enabled chat number on Kapso,
 * lists Kapso's outbound history since catchUpSince and stores the missing ones exactly like the
 * webhook (ExternalStore). Idempotent: the wamid is the dedup key (unique wa_message_id). The
 * first run after deploy back-fills the gap since the chat import of 2026-10-25. Logs counts only.
 */
@BackgroundJob({ name: 'external-catch-up' })
@Injectable()
export class ExternalCatchUpJob extends TickerJob {
  private readonly log = new Logger(ExternalCatchUpJob.name);
  protected readonly ticker = new Ticker({
    name: ExternalCatchUpJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: ExternalRepo,
    private readonly store: ExternalStore,
    @Inject(KAPSO_HISTORY) private readonly kapso: KapsoHistory,
  ) {
    super();
  }

  /**
   * One pass over every Kapso chat number. Never throws; one number's failure doesn't stop the
   * others.
   */
  async runOnce(now = new Date()): Promise<CatchUpCounts[]> {
    const out: CatchUpCounts[] = [];
    for (const n of kapsoChatNumbers()) out.push(await this.number(n, now));
    return out;
  }

  private async number(n: KapsoNumber, now: Date): Promise<CatchUpCounts> {
    const counts: CatchUpCounts = { listed: 0, stored: 0, known: 0, skipped: 0 };
    const label = tail(n.env.phoneNumberId);
    try {
      await this.pages(n, { since: await this.sinceFor(n, now), counts, label });
    } catch (e) {
      this.log.error(`external catch-up ${label} stopped: ${(e instanceof Error ? e.message : String(e)).slice(0, 200)}`);
    }
    if (counts.stored > 0 || counts.skipped > 0) this.log.log(`external catch-up ${label}: ${JSON.stringify(counts)}`);
    return counts;
  }

  private async sinceFor(n: KapsoNumber, now: Date): Promise<string> {
    const newest = await this.queries.newestExternal({
      line: n.line,
      numberId: n.numberId ?? null,
    });
    return catchUpSince(newest, now).toISOString();
  }

  /** Up to MAX_PAGES pages of the number's history; a cursor still left waits for the next run. */
  private async pages(n: KapsoNumber, run: PagesRun): Promise<void> {
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const query = { since: run.since, ...(after ? { after } : {}) };
      const res = await this.kapso.outbound(n.env, query);
      await this.page(n, res.messages, run.counts);
      after = res.after;
      if (!after) break;
    }
    if (after) this.log.warn(`external catch-up ${run.label}: capped at ${MAX_PAGES} pages, the rest next run`);
  }

  /** Stores the page's messages we don't hold yet, oldest first (same-second order, orderedAt). */
  private async page(n: KapsoNumber, messages: unknown[], counts: CatchUpCounts): Promise<void> {
    counts.listed += messages.length;
    const ids = messages.flatMap((m) => field(m, 'id') ?? []);
    const held = await this.queries.existing(ids);
    const missing = messages
      .filter((m) => !held.has(field(m, 'id') ?? ''))
      .sort((a, b) => timeOf(a) - timeOf(b));
    counts.known += messages.length - missing.length;
    const from = {
      line: n.line,
      numberId: n.numberId ?? null,
      phoneNumberId: n.env.phoneNumberId,
    };
    for (const message of missing) counts[await this.store.store({ message, from })] += 1;
  }
}
