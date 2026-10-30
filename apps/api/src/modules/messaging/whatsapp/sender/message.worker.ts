import { retry, type WaLine } from '@ab/shared';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { sleep } from '../../../../common/cache/sleep';
import { activeNumberId } from '../../../../common/integrations/numbers-overlay';
import { PushService } from '../../../../common/push/push.service';
import { holdKey, paymentSubject, WA_PAYMENT_HOLD } from './hold/payment-hold';
import { PaymentHolds } from './hold/payment-holds';
import { MessageDispatch } from './message.dispatch';
import { authSubject, RECORD_DELAYS_MS, sendingAt, UNRECORDED, type FailedInput, type SendJob, type SendOutcome } from './message.job';
import type { NumberRoute } from '../numbers/number-route';
import { CRM_RATE_LIMITED, failurePlan, messageLabel, readyToSend, SENDING } from './send-plan';
import { AUTO_OFF, dropReason, isAutomatic } from './send-stale';
import { SenderQueries, type DueMessage } from './sender.queries';
import type { WaSent } from '../whatsapp.types';

export type { SendJob, SendOutcome } from './message.job';

interface HoldAt { line: WaLine; route?: NumberRoute | null; now: Date }

/**
 * One queued row, end to end (docs/12 §3.3): expiry, send-time staleness (a staff alert's teacher
 * checked again: staffAtSend), the automatic-messages hold (auto_off), the 131042 line hold
 * (hold/), claim, send, outcome. Never throws.
 * Idempotency: a row is claimed by compare-and-set before Meta is called, so two
 * workers never send it twice; producers dedupe the row itself by dedup_key.
 */
@Injectable()
export class MessageWorker {
  private readonly log = new Logger(MessageWorker.name);
  /** Backoff wait for the «sent» write; tests replace it. */
  wait: (ms: number) => Promise<void> = sleep;

  constructor(
    private readonly queries: SenderQueries,
    private readonly dispatch: MessageDispatch,
    private readonly push: PushService,
    /** The 131042 line hold; absent (unit tests) = no line hold, the row hold still applies. */
    @Optional() private readonly holds?: PaymentHolds,
  ) {}

  async process(job: SendJob): Promise<SendOutcome> {
    try {
      return await this.run(job);
    } catch (e) {
      this.log.error(`message ${job.row.id}: ${e instanceof Error ? e.message : String(e)}`);
      return 'skipped';
    }
  }

  private async run(job: SendJob): Promise<SendOutcome> {
    const { row, template, now, autoOn, route } = job;
    const { line, via } = sendingAt(job, this.dispatch.multi);
    const staff = await this.queries.staffAtSend(row);
    const drop = dropReason(staff ? { ...row, staff } : row, now);
    if (drop) {
      await this.queries.expire(row.id, drop);
      return drop.code;
    }
    if (row.error_code === SENDING) return this.failed({ row, error: UNRECORDED, attempts: row.attempts, now, line, route });
    // Not left queued: it would go out at a wrong time once the switch is back ON. No push.
    if (!autoOn && isAutomatic(row)) {
      await this.queries.expire(row.id, AUTO_OFF);
      return 'held';
    }
    if (await this.notNow(job, { line, route, now })) return 'skipped';
    const attempts = await this.claim({ row, now, line, route });
    if (attempts === null) return 'skipped';
    let sent: WaSent;
    try {
      sent = await this.dispatch.send(row, template, via);
    } catch (error) {
      return this.failed({ row, error, attempts, now, line, route });
    }
    const record = () => this.queries.sent({ row, waMessageId: sent.waMessageId, at: new Date() });
    if (!(await retry(record, { delays: RECORD_DELAYS_MS, sleep: this.wait }))) {
      this.log.log(`message ${row.id} was marked sent by hand while it was sending`);
    }
    return 'sent';
  }

  /**
   * null = not ours to send now: the line is unconfigured or the recipient is off the allow-list
   * (the row waits untouched, docs/12 §13.3), or another worker claimed it first. The claim
   * stamps the line only when two lines are in use (§13.2), and the number in module mode (docs/23 phase 3).
   */
  private async claim(input: { row: DueMessage; now: Date; line: WaLine; route?: NumberRoute | null }): Promise<number | null> {
    const { row, now, line, route } = input;
    if (route !== undefined) return this.claimNumber({ row, now, route });
    if (!this.dispatch.ready(row, line)) return null;
    const numberId = activeNumberId(line);
    return this.queries.claim({ id: row.id, attempts: row.attempts, now, ...(this.dispatch.multi ? { line } : {}), ...(numberId ? { numberId } : {}) });
  }

  /** Module mode (decision 8): only with a number that can send now; stamps number_id and line = its role. */
  private async claimNumber(input: { row: DueMessage; now: Date; route: NumberRoute | null }): Promise<number | null> {
    const { row, now, route } = input;
    if (!route || !this.dispatch.ready(row, route)) return null;
    return this.queries.claim({ id: row.id, attempts: row.attempts, now, line: route.line, numberId: route.numberId });
  }

  private async failed(input: FailedInput): Promise<SendOutcome> {
    const { row, now, line, route } = input;
    const plan = failurePlan(input);
    await this.queries.failure(row.id, plan);
    // The CRM's rate limit (per key): the line waits for Retry-After this pass; not a token failure, no push.
    if (plan.error_code === CRM_RATE_LIMITED) return 'paused';
    if (plan.error_code === WA_PAYMENT_HOLD) {
      return this.paymentHeld({ ...input, next: plan.next_attempt_at });
    }
    if (plan.attempts !== undefined) {
      // The token, not the message: rows wait; one push a day (fixed in Business Manager).
      this.log.error(`WhatsApp refused the token (${plan.error_code}); sending paused: ${plan.error_text}`);
      // One push per line per day (the notifications subject unchanged); module mode: per number.
      await this.alert(row, authSubject({ line, route, now }));
      return 'paused';
    }
    if (plan.status === 'queued') return 'retry';
    this.log.warn(`message ${row.id} failed: ${plan.error_code} ${plan.error_text}`);
    await this.alert(row, `${row.id}:${now.getTime()}`);
    return 'failed';
  }

  /** Not now: its PDF is not attached yet, or its line is on a 131042 hold (deferred, untried). */
  private async notNow(job: SendJob, at: HoldAt): Promise<boolean> {
    if (!readyToSend(job.row, job.template)) return true;
    const until = this.holds?.heldUntil(holdKey(at), at.now);
    if (!this.holds || !until) return false;
    await this.holds.defer(job.row, until);
    return true;
  }

  /** 131042: the line waits for this row's next try; one push per line (number) a day. */
  private async paymentHeld(input: FailedInput & { next: string | null }): Promise<SendOutcome> {
    const { row, line, route, now, next } = input;
    const key = holdKey({ line, route });
    this.log.error(`WhatsApp refused for payment (131042) on ${key}; held until ${next ?? '?'}`);
    this.holds?.hold(key, next);
    await this.alert(row, paymentSubject({ line, route, now }));
    return 'paused';
  }

  /** reminder_failed, keyed per failed try: a row that fails again after the admin's retry pushes again. */
  private alert(row: DueMessage, subject: string): Promise<void> {
    return this.push.notifyAdmins('reminder_failed', {
      subject,
      vars: { template: messageLabel(row), name: row.guardian?.name ?? row.lead?.name ?? row.phone_e164 },
      data: { phone: row.phone_e164, messageId: row.id },
    });
  }
}
