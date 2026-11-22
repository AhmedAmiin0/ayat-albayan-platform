import { Injectable } from '@nestjs/common';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { holdKey } from './hold-key';
import { LaneHold } from './lane-hold';
import type { HoldAt, HoldCheck } from './lane-hold.types';
import { holdUntil, PAYMENT_HOLD_MAX_MS, PAYMENT_HOLD_MIN_MS, WA_PAYMENT_HOLD } from './payment-hold';
import { PaymentHoldRepo } from './payment-hold.repo';

export type { HoldAt } from './lane-hold.types';

/**
 * The 131042 line hold (docs/12 §3.3): once a TEMPLATE row of a line (module mode: a number) got
 * Meta's 131042, the line's other template rows wait behind it as the probe (lane-hold). Session
 * texts are never line-held (Meta may still take them; a deferred reply could miss its 24 h
 * window): one that gets 131042 is held alone.
 */
@Injectable()
export class PaymentHolds {
  private readonly lane: LaneHold;

  constructor(repo: PaymentHoldRepo) {
    this.lane = new LaneHold(repo, {
      code: WA_PAYMENT_HOLD,
      text: 'held: the WhatsApp Business account has a payment issue (Meta 131042)',
      staggerMs: 2 * 60_000,
      span: { minMs: PAYMENT_HOLD_MIN_MS, maxMs: PAYMENT_HOLD_MAX_MS },
      keyOf: (at) => holdKey(at),
      holds: (row) => row.template_key !== null,
    });
  }

  /** Before the claim; 'aged' = due 48 h ago: the worker fails it as 131042. */
  check(row: DueMessage, at: HoldAt): Promise<HoldCheck> {
    return this.lane.check(row, at);
  }

  /** A template row's 131042 sets (or renews) its line's hold and makes it the probe. */
  async probe(plan: FailurePlan, at: HoldAt & { row: DueMessage }): Promise<FailurePlan> {
    if (plan.error_code !== WA_PAYMENT_HOLD || !at.row.template_key) return plan;
    const until = await this.lane.hold(at);
    return until === null ? plan : { ...plan, next_attempt_at: holdUntil(at.row, until) };
  }

  deferRest(rows: readonly DueMessage[], at: HoldAt): Promise<void> {
    return this.lane.deferRest(rows, at);
  }

  /** A row of the line was sent: billing works, its deferred rows are due now. Never throws. */
  lift(at: HoldAt): Promise<void> {
    return this.lane.lift(at);
  }
}
