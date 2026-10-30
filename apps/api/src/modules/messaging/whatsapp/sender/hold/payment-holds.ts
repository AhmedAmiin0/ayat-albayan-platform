import { Injectable, Logger } from '@nestjs/common';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { holdKey, type HoldPlace } from './hold-key';
import { LineHolds } from './line-holds';
import { holdUntil, paymentHoldAged, WA_PAYMENT_HOLD } from './payment-hold';
import { PaymentHoldRepo } from './payment-hold.repo';

/** The reason on the rows a held line defers untried (the probe row keeps Meta's text). */
const LINE_HELD = 'held: the WhatsApp Business account has a payment issue (Meta 131042)';
/** The deferred rows come due this long after the probe, so at the hold end only the probe is. */
export const LINE_HOLD_STAGGER_MS = 2 * 60_000;

/** What the line hold says about a due row: send it, it was deferred, or it reached 48 h. */
type HoldCheck = 'send' | 'deferred' | 'aged';

/** Where a row leaves from, and when (its key: holdKey). */
export interface HoldAt extends HoldPlace {
  now: Date;
}

const iso = (ms: number) => new Date(ms).toISOString();

/**
 * The line hold (docs/12 §3.3): once a TEMPLATE row of a line (module mode: a number) got Meta's
 * 131042, the line's other template rows are not sent until the hold end, when that row is the one
 * probe; they are deferred to just after it. Session texts are never line-held (Meta may still take
 * them; a deferred reply could miss its 24 h window): one that gets 131042 is held alone. Any row
 * of the line that is sent lifts the hold and frees its deferred rows.
 */
@Injectable()
export class PaymentHolds {
  private readonly log = new Logger(PaymentHolds.name);
  private readonly lines = new LineHolds();

  constructor(private readonly repo: PaymentHoldRepo) {}

  /**
   * Before the claim. A row that expires before the deferral end goes through as a probe (a
   * 131042 holds it at no cost); one due 48 h ago is not deferred again (the worker fails it).
   */
  async check(row: DueMessage, at: HoldAt): Promise<HoldCheck> {
    const key = row.template_key ? holdKey(at) : null;
    const until = key === null ? null : this.lines.heldUntil(key, at.now);
    if (until === null) return 'send';
    if (paymentHoldAged(row, at.now)) return 'aged';
    const next = holdUntil(row, until + LINE_HOLD_STAGGER_MS);
    if (Date.parse(next) < until + LINE_HOLD_STAGGER_MS) return 'send';
    await this.repo.defer({ id: row.id, attempts: row.attempts, next, text: LINE_HELD });
    return 'deferred';
  }

  /**
   * A template row's 131042 sets (or renews) its line's hold and makes it the probe: its next try
   * is the hold end. A renewal moves the rows the last hold deferred, in one write.
   */
  async probe(plan: FailurePlan, at: HoldAt & { row: DueMessage }): Promise<FailurePlan> {
    if (plan.error_code !== WA_PAYMENT_HOLD || !at.row.template_key) return plan;
    const key = holdKey(at);
    if (key === null) return plan;
    const set = this.lines.hold(key, at.now);
    if (!set.fresh) return plan;
    if (set.prev !== null) {
      const from = [iso(set.prev), iso(set.prev + LINE_HOLD_STAGGER_MS)];
      await this.repo.move({ from, to: iso(set.until + LINE_HOLD_STAGGER_MS) });
    }
    return { ...plan, next_attempt_at: holdUntil(at.row, set.until) };
  }

  /** This pass's later rows of the held line, deferred in one write (never filling a batch). */
  async deferRest(rows: readonly DueMessage[], at: HoldAt): Promise<void> {
    const key = holdKey(at);
    const until = key === null ? null : this.lines.heldUntil(key, at.now);
    if (until === null) return;
    const next = iso(until + LINE_HOLD_STAGGER_MS);
    const ids = rows.filter((r) => r.template_key && holdUntil(r, Date.parse(next)) === next);
    if (ids.length === 0) return;
    await this.repo.deferMany({ ids: ids.map((r) => r.id), next, text: LINE_HELD });
  }

  /** A row of the line was sent: billing works, its deferred rows are due now. Never throws. */
  async lift(at: HoldAt): Promise<void> {
    const key = holdKey(at);
    const until = key === null ? null : this.lines.lift(key);
    if (until === null || until + LINE_HOLD_STAGGER_MS <= at.now.getTime()) return;
    const from = [iso(until), iso(until + LINE_HOLD_STAGGER_MS)];
    try {
      await this.repo.move({ from, to: at.now.toISOString() });
    } catch (e) {
      this.log.warn(`payment hold lift: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
