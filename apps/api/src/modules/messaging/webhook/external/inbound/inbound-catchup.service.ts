import { waIdToE164 } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ExternalQueries } from '@/modules/messaging/webhook/external/external.queries';
import type { KapsoNumber } from '@/modules/messaging/webhook/external/kapso-numbers';
import { InboundService } from '@/modules/messaging/webhook/inbound/webhook.inbound.service';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { inboundSince, isLate } from './inbound-history';
import { InboundCatchUpRepo } from './inbound-catchup.repo';
import { InboundListing, MAX_PAGES } from './inbound-listing';

export { MAX_PAGES } from './inbound-listing';

type Count = 'listed' | 'stored' | 'late' | 'known' | 'skipped' | 'failed';
/**
 * stored = new rows; late = of those, older than LATE_MS (the webhook missed them); failed = items
 * whose handling threw. complete = the whole window was read and applied (no error, no cap).
 */
export type InboundCounts = Record<Count, number> & { complete: boolean };

interface Run {
  now: Date;
  label: string;
  counts: InboundCounts;
  /** Phones that got a new row this run (answered(), once per phone). */
  phones: Set<string>;
}

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 200);
/** The tail of an id for the log: never a phone number, a key or a body. */
const tail = (id: string): string => `…${id.slice(-4)}`;

/**
 * The families' messages the webhook never delivered (incident 2026-10-30: Kapso's webhook was
 * gone). For one Kapso chat number: reads Kapso's INBOUND history since inboundSince
 * (InboundListing) and hands every wamid we do not hold, oldest first, to InboundService.handle,
 * the webhook's own path (row, line and number_id, lead or guardian, auto-assign, quick reply,
 * media id, reaction, unread, thread summary). Idempotent by wamid: held ones are skipped before any side effect, and a
 * webhook delivery racing us loses to the unique wa_message_id (handle → false, no push). A row
 * older than LATE_MS when stored is quiet: no push (InboundGapAlert tells the admins once instead).
 * One failing item is counted and logged by its wamid tail; the rest still run.
 */
@Injectable()
export class InboundCatchUp {
  private readonly log = new Logger(InboundCatchUp.name);

  constructor(
    private readonly repo: InboundCatchUpRepo,
    private readonly listing: InboundListing,
    private readonly ext: ExternalQueries,
    private readonly inbound: InboundService,
  ) {}

  /** Never throws: a Kapso or database error ends this number's run only (logged, incomplete). */
  async number(n: KapsoNumber, opts: { now: Date; full: boolean }): Promise<InboundCounts> {
    const label = tail(n.env.phoneNumberId);
    const run: Run = { now: opts.now, label, phones: new Set(), counts: zero() };
    try {
      await this.read(n, { run, full: opts.full });
    } catch (e) {
      run.counts.complete = false;
      this.log.error(`inbound catch-up ${run.label} stopped: ${reason(e)}`);
    } finally {
      await this.stamp(run);
    }
    const { counts } = run;
    if (counts.stored + counts.skipped + counts.failed > 0) {
      this.log.log(`inbound catch-up ${run.label}: ${JSON.stringify(counts)}`);
    }
    return counts;
  }

  private async read(n: KapsoNumber, r: { run: Run; full: boolean }): Promise<void> {
    const { run, full } = r;
    const newest = await this.repo.newestInbound({ line: n.line, numberId: n.numberId ?? null });
    const since = inboundSince(newest, { now: run.now, full }).toISOString();
    const res = await this.listing.read({ n, since, newest, full });
    Object.assign(run.counts, { listed: res.listed, skipped: res.skipped, known: res.known });
    if (res.capped) this.log.warn(`inbound catch-up ${run.label}: capped at ${MAX_PAGES} pages`);
    for (const e of res.events) await this.one(run, e);
    run.counts.complete = !res.capped && run.counts.failed === 0;
  }

  private async one(run: Run, e: InboundEvent): Promise<void> {
    const late = isLate(e.at, run.now);
    let stored: boolean;
    try {
      stored = await this.inbound.handle(e, { quiet: late, now: run.now });
    } catch (err) {
      run.counts.failed += 1;
      const name = err instanceof Error ? err.name : typeof err;
      const id = tail(e.waMessageId);
      return void this.log.error(`inbound catch-up ${run.label}: ${id} failed (${name})`);
    }
    if (!stored) return void (run.counts.known += 1);
    run.counts.stored += 1;
    if (late) run.counts.late += 1;
    const phone = waIdToE164(e.from);
    if (phone) run.phones.add(phone);
  }

  /** answered() for every phone stored this run, even when a later step failed; each on its own. */
  private async stamp(run: Run): Promise<void> {
    for (const phone of run.phones) {
      try {
        await this.answered(phone);
      } catch (e) {
        this.log.error(`inbound catch-up ${run.label}: read stamp failed: ${reason(e)}`);
      }
    }
  }

  /**
   * A back-filled message staff already answered from Kapso's inbox is not unread: as ExternalStore
   * does when a reply arrives, the phone's inbound rows before the reply's second are stamped read.
   */
  private async answered(phone: string): Promise<void> {
    const reply = await this.repo.lastExternalReply(phone);
    if (!reply) return;
    const second = new Date(Math.floor(reply.getTime() / 1000) * 1000);
    await this.ext.markAnsweredRead(phone, second, reply);
  }
}

const zero = (): InboundCounts => ({
  ...{ listed: 0, stored: 0, late: 0, known: 0, skipped: 0, failed: 0 },
  complete: false,
});
