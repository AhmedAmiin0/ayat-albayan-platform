import { retry } from '@ab/shared';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { sleep } from '@/common/cache/sleep';
import { PushService } from '@/common/push/push.service';
import { PAYMENT_HOLD_EXPIRED, paymentSubject, WA_PAYMENT_HOLD } from './hold/payment-hold';
import { PaymentHolds, type HoldAt } from './hold/payment-holds';
import { MessageDispatch } from './message.dispatch';
import { authSubject, RECORD_DELAYS_MS, sendingAt, UNRECORDED, type FailedInput, type PassJob, type SendJob, type SendOutcome } from './message.job';
import { claimRow } from './send-claim';
import type { FailurePlan } from './send-plan';
import { CRM_RATE_LIMITED, failurePlan, messageLabel, readyToSend, SENDING } from './send-plan';
import { AUTO_OFF, dropReason, isAutomatic } from './send-stale';
import { SenderQueries, type DueMessage } from './sender.queries';
import type { WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';

export type { PassJob, SendJob, SendOutcome } from './message.job';

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
    const { row, template, now, route } = job;
    const { line, via } = sendingAt(job, this.dispatch.multi);
    const staff = await this.queries.staffAtSend(row);
    const drop = dropReason(staff ? { ...row, staff } : row, now);
    if (drop) {
      await this.queries.expire(row.id, drop);
      return drop.code;
    }
    if (row.error_code === SENDING) return this.failed({ row, error: UNRECORDED, attempts: row.attempts, now, line, route });
    const wait = await this.notNow(job, { line, route, now });
    if (wait) return wait;
    const deps = { dispatch: this.dispatch, queries: this.queries };
    const attempts = await claimRow(deps, { row, now, line, route });
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
    await this.holds?.lift({ line, route, now });
    return 'sent';
  }

  private async failed(input: FailedInput): Promise<SendOutcome> {
    const { row, now, line, route } = input;
    const plan = await this.plan(input);
    await this.queries.failure(row.id, plan);
    // The CRM's rate limit (per key): the line waits for Retry-After this pass; not a token failure, no push.
    if (plan.error_code === CRM_RATE_LIMITED) return 'paused';
    if (plan.error_code === WA_PAYMENT_HOLD) {
      // 131042: the row (a template: its line too) waits; one push per line (number) a day.
      this.log.error(`WhatsApp refused for payment (131042) on ${line}: message ${row.id} held`);
      await this.alert(row, paymentSubject({ line, route, now }));
      return 'paused';
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

  /**
   * Not now: automatic messages are OFF ('held'), its PDF is not attached yet ('skipped'), or its
   * line is on a 131042 hold ('skipped': deferred, untried). A line-held row due 48 h ago fails as
   * 131042 instead (pushed per row). null = send.
   */
  private async notNow(job: SendJob, at: HoldAt): Promise<SendOutcome | null> {
    const { row } = job;
    // Not left queued: it would go out at a wrong time once the switch is back ON. No push.
    if (!job.autoOn && isAutomatic(row)) {
      await this.queries.expire(row.id, AUTO_OFF);
      return 'held';
    }
    if (!readyToSend(row, job.template)) return 'skipped';
    const check = await this.holds?.check(row, at);
    if (check === 'deferred') return 'skipped';
    if (check !== 'aged') return null;
    return this.failed({ ...at, row, error: PAYMENT_HOLD_EXPIRED, attempts: row.attempts });
  }

  /** The failure's plan; a template's 131042 also holds its line with this row as the probe. */
  private plan(input: FailedInput): Promise<FailurePlan> {
    const plan = failurePlan(input);
    if (!this.holds) return Promise.resolve(plan);
    return this.holds.probe(plan, input);
  }

  /** The pass's later rows of a paused line: deferred in one write while it is 131042-held. */
  async deferRest(probe: PassJob, rest: readonly DueMessage[]): Promise<void> {
    const { line } = sendingAt(probe, this.dispatch.multi);
    await this.holds?.deferRest(rest, { line, route: probe.route, now: probe.now });
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
