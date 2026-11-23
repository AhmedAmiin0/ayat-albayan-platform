import { Logger } from '@nestjs/common';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import type { HoldCheck, HoldAt, LaneHoldPolicy } from './lane-hold.types';
import { LineHolds } from './line-holds';
import { holdUntil, paymentHoldAged } from './payment-hold';
import type { PaymentHoldRepo } from './payment-hold.repo';

const iso = (ms: number) => new Date(ms).toISOString();
const log = new Logger('LaneHold');

/**
 * One lane hold (docs/12 §3.3): once a row of a lane (a line, or a number) failed for the lane's
 * sake, its other rows are not sent until the hold end, when that row is the one probe; they are
 * deferred to just after it. Any row of the lane that is sent lifts the hold and frees them.
 */
export class LaneHold {
  private readonly lines: LineHolds;

  constructor(
    private readonly repo: PaymentHoldRepo,
    private readonly policy: LaneHoldPolicy,
  ) {
    this.lines = new LineHolds(policy.span);
  }

  /** The hold end while the row's lane is held for it, else null. */
  heldUntil(row: DueMessage, at: HoldAt): number | null {
    const key = this.policy.holds(row) ? this.policy.keyOf(at) : null;
    return key === null ? null : this.lines.heldUntil(key, at.now);
  }

  /**
   * Before the claim. A row that expires before the deferral end goes through as a probe; one due
   * 48 h ago is not deferred again (the caller decides it).
   */
  async check(row: DueMessage, at: HoldAt): Promise<HoldCheck> {
    const until = this.heldUntil(row, at);
    if (until === null) return 'send';
    if (paymentHoldAged(row, at.now)) return 'aged';
    const end = until + this.policy.staggerMs;
    const next = holdUntil(row, end);
    if (Date.parse(next) < end) return 'send';
    const { code, text } = this.policy;
    await this.repo.defer({ id: row.id, attempts: row.attempts, next, text, code });
    return 'deferred';
  }

  /**
   * Sets (or renews) the lane's hold; its end, or null when the lane was already held or has no
   * key. A renewal moves the rows the last hold deferred, in one write.
   */
  async hold(at: HoldAt): Promise<number | null> {
    const key = this.policy.keyOf(at);
    const set = key === null ? null : this.lines.hold(key, at.now);
    if (!set?.fresh) return null;
    if (set.prev !== null) {
      const to = iso(set.until + this.policy.staggerMs);
      await this.repo.move({ from: this.deferredAt(set.prev), to, code: this.policy.code });
    }
    return set.until;
  }

  /** This pass's later rows of the held lane, deferred in one write (never filling a batch). */
  async deferRest(rows: readonly DueMessage[], at: HoldAt): Promise<void> {
    const key = this.policy.keyOf(at);
    const until = key === null ? null : this.lines.heldUntil(key, at.now);
    if (until === null) return;
    const next = iso(until + this.policy.staggerMs);
    const due = rows.filter((r) => this.policy.holds(r) && holdUntil(r, Date.parse(next)) === next);
    if (due.length === 0) return;
    const { code, text } = this.policy;
    await this.repo.deferMany({ ids: due.map((r) => r.id), next, text, code });
  }

  /** A row of the lane was sent: its deferred rows are due now. Never throws. */
  async lift(at: HoldAt): Promise<void> {
    const key = this.policy.keyOf(at);
    const until = key === null ? null : this.lines.lift(key);
    if (until === null || until + this.policy.staggerMs <= at.now.getTime()) return;
    try {
      const to = at.now.toISOString();
      await this.repo.move({ from: this.deferredAt(until), to, code: this.policy.code });
    } catch (e) {
      log.warn(`${this.policy.code} lift: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Where a hold ending at `until` put its rows: the probe's time, and the deferred rows'. */
  private deferredAt(until: number): string[] {
    return [iso(until), iso(until + this.policy.staggerMs)];
  }
}
