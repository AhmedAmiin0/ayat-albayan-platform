import { Inject, Injectable } from '@nestjs/common';
import { KAPSO_HISTORY } from '@/modules/messaging/webhook/external/external-status';
import { ExternalQueries } from '@/modules/messaging/webhook/external/external.queries';
import type { KapsoHistory } from '@/modules/messaging/webhook/external/kapso-history';
import type { KapsoNumber } from '@/modules/messaging/webhook/external/kapso-numbers';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import { historyInbound } from './inbound-history';

/** Pages per number per run (100 each), as the outbound catch-up; the rest waits a run. */
export const MAX_PAGES = 20;

/** What one number's catch-up reads (InboundCatchUp). */
interface ListingQuery {
  n: KapsoNumber;
  /** ISO time: Kapso's messages from then on. */
  since: string;
  /** The newest inbound row held before the run: a reaction up to it was already applied. */
  newest: Date | null;
  /** A full (week) read re-applies every reaction: one sent in a gap is not held anywhere. */
  full: boolean;
}

interface Listing {
  /** The family messages we do not hold, oldest first (whole run, not per page). */
  events: InboundEvent[];
  listed: number;
  /** Not inbound, unreadable, or a reaction already applied. */
  skipped: number;
  /** Already stored (by the webhook or an earlier run). */
  known: number;
  /** MAX_PAGES read and Kapso still had more. */
  capped: boolean;
}

/**
 * Kapso's INBOUND history of one number since `since`, every page read before anything is applied:
 * Kapso lists newest first, so the whole listing is put oldest first (a same-second pair keeps
 * WhatsApp's order: the reversed listing, then a stable sort). A Kapso error throws (nothing of the
 * run is applied). Held wamids are dropped per page (one `in` query of ≤ 100 ids).
 */
@Injectable()
export class InboundListing {
  constructor(
    private readonly ext: ExternalQueries,
    @Inject(KAPSO_HISTORY) private readonly kapso: KapsoHistory,
  ) {}

  async read(q: ListingQuery): Promise<Listing> {
    const out: Listing = { events: [], listed: 0, skipped: 0, known: 0, capped: false };
    let after: string | undefined;
    for (let page = 0; page < MAX_PAGES; page++) {
      const cursor = after ? { after } : {};
      const res = await this.kapso.inbound(q.n.env, { since: q.since, ...cursor });
      await this.page(q, { out, messages: res.messages });
      after = res.after;
      if (!after) break;
    }
    out.capped = after !== undefined;
    out.events = out.events.reverse().sort((a, b) => +a.at - +b.at);
    return out;
  }

  private async page(q: ListingQuery, p: { out: Listing; messages: unknown[] }): Promise<void> {
    const { out, messages } = p;
    out.listed += messages.length;
    const number = q.n.numberId ? { numberId: q.n.numberId } : {};
    const at = { line: q.n.line, phoneNumberId: q.n.env.phoneNumberId, ...number };
    const events = messages.flatMap((m) => historyInbound(m, at) ?? []).filter((e) => fresh(q, e));
    out.skipped += messages.length - events.length;
    const held = await this.ext.existing(events.map((e) => e.waMessageId));
    const missing = events.filter((e) => !held.has(e.waMessageId));
    out.known += events.length - missing.length;
    out.events.push(...missing);
  }
}

/** A reaction up to the newest held row was applied then (no repeated UPDATE / broadcast). */
const fresh = (q: ListingQuery, e: InboundEvent): boolean =>
  e.type !== 'reaction' || q.full || !q.newest || e.at > q.newest;
