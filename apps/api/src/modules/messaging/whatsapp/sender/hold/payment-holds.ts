import { Injectable } from '@nestjs/common';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { holdUntil } from './payment-hold';
import { PaymentHoldRepo } from './payment-hold.repo';

/** The reason on the rows a held line defers untried (the probe row keeps Meta's text). */
const LINE_HELD = 'held: the WhatsApp Business account has a payment issue (Meta 131042)';

/**
 * The line hold (docs/12 §13.17): once a row of a line (module mode: a number) got Meta's 131042,
 * the line's other rows are not sent until that row's next try, the one probe; each is deferred to
 * the same time instead (out of due(), so they never fill the batch). In memory: a restart costs
 * one extra probe. The hold ends at the probe time; a probe that fails again holds anew.
 */
@Injectable()
export class PaymentHolds {
  private readonly until = new Map<string, number>();

  constructor(private readonly repo: PaymentHoldRepo) {}

  hold(key: string, next: string | null): void {
    const at = Date.parse(next ?? '');
    if (Number.isFinite(at)) this.until.set(key, at);
  }

  /** The line's hold end while it holds, else null (a past hold is forgotten). */
  heldUntil(key: string, now: Date): string | null {
    const at = this.until.get(key);
    if (at === undefined) return null;
    if (at > now.getTime()) return new Date(at).toISOString();
    this.until.delete(key);
    return null;
  }

  /** Defers a row of a held line to the hold's end, never past its own expiry. */
  defer(row: DueMessage, until: string): Promise<void> {
    const next = holdUntil(row, Date.parse(until));
    return this.repo.defer({ id: row.id, attempts: row.attempts, next, text: LINE_HELD });
  }
}
