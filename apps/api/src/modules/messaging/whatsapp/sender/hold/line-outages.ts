import { Inject, Injectable } from '@nestjs/common';
import type { FailurePlan } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import { laneKey } from './hold-key';
import { LaneHold } from './lane-hold';
import type { HoldAt } from './lane-hold.types';
import { LINE_DOWN_MAX_MS, LINE_DOWN_MIN_MS, WA_LINE_DOWN } from './line-down';
import { holdUntil } from './payment-hold';
import { PaymentHoldRepo } from './payment-hold.repo';

/** A timed-out row stays uncertain (never resent); this many in a row hold the rest of its lane. */
const TIMEOUTS_TO_HOLD = 3;

const timedOut = (error: unknown): boolean =>
  error instanceof WaError && error.info.timedOut === true;

/**
 * The outage hold (docs/12 §3.3): a line-down failure makes its row the lane's probe and defers
 * every other row of the lane (templates and texts: nothing goes out while the provider is down),
 * 1 → 2 → 4 … ≤ 30 min. Any row of the lane that is sent lifts it.
 */
@Injectable()
export class LineOutages {
  private readonly lane: LaneHold;
  /** Timeouts in a row per lane key, in memory (a restart only delays the hold). */
  private readonly timeouts = new Map<string, number>();

  constructor(@Inject(PaymentHoldRepo) repo: PaymentHoldRepo) {
    this.lane = new LaneHold(repo, {
      code: WA_LINE_DOWN,
      text: 'held: the WhatsApp provider is down or unreachable; sent once it answers',
      staggerMs: 30_000,
      span: { minMs: LINE_DOWN_MIN_MS, maxMs: LINE_DOWN_MAX_MS },
      keyOf: (at) => laneKey(at),
      holds: () => true,
    });
  }

  /** Before the claim: a row due 48 h ago is not deferred, it is tried (and counted). */
  async check(row: DueMessage, at: HoldAt): Promise<'send' | 'deferred'> {
    return (await this.lane.check(row, at)) === 'deferred' ? 'deferred' : 'send';
  }

  /** A line-down row is the probe: its next try is the hold end (already held: the same end). */
  async probe(plan: FailurePlan, at: HoldAt & { row: DueMessage }): Promise<FailurePlan> {
    if (plan.error_code !== WA_LINE_DOWN) return plan;
    const until = (await this.lane.hold(at)) ?? this.lane.heldUntil(at.row, at);
    return until === null ? plan : { ...plan, next_attempt_at: holdUntil(at.row, until) };
  }

  /**
   * After a refused send: a timeout counts toward the lane's hold (true = the lane is held now,
   * with no probe: the next due row is); any other answer breaks the run.
   */
  async settle(error: unknown, at: HoldAt): Promise<boolean> {
    const key = laneKey(at);
    const run = timedOut(error) ? (this.timeouts.get(key) ?? 0) + 1 : 0;
    this.timeouts.set(key, run);
    if (run < TIMEOUTS_TO_HOLD) return false;
    await this.lane.hold(at);
    return true;
  }

  deferRest(rows: readonly DueMessage[], at: HoldAt): Promise<void> {
    return this.lane.deferRest(rows, at);
  }

  /** A row of the lane was sent: the provider answers again. Never throws. */
  lift(at: HoldAt): Promise<void> {
    this.timeouts.delete(laneKey(at));
    return this.lane.lift(at);
  }
}
