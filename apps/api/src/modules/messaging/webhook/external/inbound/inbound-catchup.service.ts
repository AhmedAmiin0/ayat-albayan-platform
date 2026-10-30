import { waIdToE164 } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { KAPSO_HISTORY } from '@/modules/messaging/webhook/external/external-status';
import { ExternalQueries } from '@/modules/messaging/webhook/external/external.queries';
import type { KapsoHistory } from '@/modules/messaging/webhook/external/kapso-history';
import type { KapsoNumber } from '@/modules/messaging/webhook/external/kapso-numbers';
import { InboundService } from '@/modules/messaging/webhook/inbound/webhook.inbound.service';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { historyInbound, inboundSince, isLate } from './inbound-history';
import { InboundCatchUpRepo } from './inbound-catchup.repo';

/** Pages per number per run (100 each), as the outbound catch-up; the rest waits a run. */
export const MAX_PAGES = 20;

/** stored = new rows; late = of those, older than LATE_MS (the webhook missed them). */
export type InboundCounts = Record<'listed' | 'stored' | 'late' | 'known' | 'skipped', number>;

interface Run {
  n: KapsoNumber;
  now: Date;
  counts: InboundCounts;
  /** Phones that got a new row this run (answered(), once per phone). */
  phones: Set<string>;
}

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 200);
/** The tail of an id for the log: never a phone number, a key or a body. */
const tail = (id: string): string => `…${id.slice(-4)}`;

/**
 * The families' messages the webhook never delivered (incident 2026-10-30: Kapso's webhook was
 * gone). For one Kapso chat number: lists Kapso's INBOUND history since inboundSince and hands
 * every wamid we do not hold to InboundService.handle, the webhook's own path (row, line and
 * number_id, lead or guardian, auto-assign, quick reply, media id, reaction, unread, thread
 * summary). Idempotent by wamid: held ones are skipped before any side effect, and a webhook
 * delivery racing us loses to the unique wa_message_id (handle → false, no push). A row older
 * than LATE_MS when stored is quiet: no push (InboundGapAlert tells the admins once instead).
 */
@Injectable()
export class InboundCatchUp {
  private readonly log = new Logger(InboundCatchUp.name);

  constructor(
    private readonly repo: InboundCatchUpRepo,
    private readonly ext: ExternalQueries,
    private readonly inbound: InboundService,
    @Inject(KAPSO_HISTORY) private readonly kapso: KapsoHistory,
  ) {}

  /** Never throws: a Kapso or database error ends this number's run only (logged). */
  async number(n: KapsoNumber, opts: { now: Date; full: boolean }): Promise<InboundCounts> {
    const run: Run = { n, now: opts.now, phones: new Set(), counts: zero() };
    const label = tail(n.env.phoneNumberId);
    try {
      const newest = await this.repo.newestInbound({ line: n.line, numberId: n.numberId ?? null });
      const since = inboundSince(newest, opts).toISOString();
      let after: string | undefined;
      for (let page = 0; page < MAX_PAGES; page++) {
        const res = await this.kapso.inbound(n.env, { since, ...(after ? { after } : {}) });
        await this.page(run, res.messages);
        after = res.after;
        if (!after) break;
      }
      if (after) this.log.warn(`inbound catch-up ${label}: capped at ${MAX_PAGES} pages`);
      for (const phone of run.phones) await this.answered(phone);
    } catch (e) {
      this.log.error(`inbound catch-up ${label} stopped: ${reason(e)}`);
    }
    const { counts } = run;
    if (counts.stored + counts.skipped > 0) {
      this.log.log(`inbound catch-up ${label}: ${JSON.stringify(counts)}`);
    }
    return counts;
  }

  /** The page's messages we do not hold yet, oldest first (same-second order, orderedAt). */
  private async page(run: Run, messages: unknown[]): Promise<void> {
    const { n, counts } = run;
    counts.listed += messages.length;
    const number = n.numberId ? { numberId: n.numberId } : {};
    const at = { line: n.line, phoneNumberId: n.env.phoneNumberId, ...number };
    const events = messages.flatMap((m) => historyInbound(m, at) ?? []);
    counts.skipped += messages.length - events.length;
    const held = await this.ext.existing(events.map((e) => e.waMessageId));
    const missing = events.filter((e) => !held.has(e.waMessageId)).sort((a, b) => +a.at - +b.at);
    counts.known += events.length - missing.length;
    for (const e of missing) await this.one(run, e);
  }

  private async one(run: Run, e: InboundEvent): Promise<void> {
    const late = isLate(e.at, run.now);
    if (!(await this.inbound.handle(e, { quiet: late }))) return void (run.counts.known += 1);
    run.counts.stored += 1;
    if (late) run.counts.late += 1;
    const phone = waIdToE164(e.from);
    if (phone) run.phones.add(phone);
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

const zero = (): InboundCounts => ({ listed: 0, stored: 0, late: 0, known: 0, skipped: 0 });
