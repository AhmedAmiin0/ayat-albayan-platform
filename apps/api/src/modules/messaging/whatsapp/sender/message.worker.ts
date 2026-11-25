import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { sleep } from '@/common/infra/cache/sleep';
import { PushService } from '@/common/push/push.service';
import { LineOutages } from './hold/line-outages';
import { PAYMENT_HOLD_EXPIRED } from './hold/payment-hold';
import { PaymentHolds, type HoldAt } from './hold/payment-holds';
import { MessageDispatch } from './message.dispatch';
import { claimRow, sendingAt, UNRECORDED, unrecordedAt, type FailedInput, type PassJob, type SendJob, type SendOutcome } from './message.job';
import { failurePush, pauseOf, timeoutPause, trySubject, type Pause } from './pause';
import { failurePlan, readyToSend, SENDING, type FailurePlan } from './send-plan';
import { AUTO_OFF, dropReason, isAutomatic } from './send-stale';
import { SenderRepo, type DueMessage } from './sender.repo';
import { TemplateMissing } from '@/modules/messaging/whatsapp/templates/check/template-missing';
import { isWindowClosedError, WindowHold } from './window/window-hold';
import { EvolutionPaceRepo } from './pace';
import { recordSent, SendClock } from './pass';
import type { WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';

export type { PassJob, SendJob } from './message.job';
/**
 * One queued row (docs/12 §3.3): the window hold (window/), expiry, staleness, auto_off, the
 * 131042 and outage holds (hold/), claim, send, outcome. Never throws; claimed by compare-and-set.
 */
@Injectable()
export class MessageWorker {
  private readonly log = new Logger(MessageWorker.name);
  wait: (ms: number) => Promise<void> = sleep; // backoff of the «sent» write; tests replace it
  /** Meta #132001 on a crm send marks its template missing (templates/check); unit tests: none. */
  @Optional() @Inject(TemplateMissing) missing?: TemplateMissing;
  /** The chat window (window/): held texts, window refusals, release(); unit tests: none. */
  @Optional() @Inject(WindowHold) private readonly window?: WindowHold;
  @Optional() @Inject(EvolutionPaceRepo) private readonly pace?: EvolutionPaceRepo; // docs/19
  @Optional() @Inject(LineOutages) outages?: LineOutages; // the outage hold (hold/line-outages)

  constructor(
    private readonly queries: SenderRepo,
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
    const held = await this.window?.due({ row, now, line, route });
    if (held) return held;
    const staff = await this.queries.staffAtSend(row);
    const drop = dropReason(staff ? { ...row, staff } : row, now);
    if (drop) {
      await this.queries.expire(row.id, drop);
      return drop.code;
    }
    if (row.error_code === SENDING)
      return this.failed({ row, error: UNRECORDED, attempts: row.attempts, now, line, route });
    const wait = await this.notNow(job, { line, route, now });
    if (wait) return wait;
    const deps = { dispatch: this.dispatch, queries: this.queries, pace: this.pace };
    const attempts = await claimRow(deps, { row, now, line, route });
    if (attempts === null) return 'skipped';
    const clock = new SendClock({ row, line }); // the `wa_send` timing line (docs/42 42-2)
    let sent: WaSent;
    try {
      sent = await clock.provider(() => this.dispatch.send(row, template, via));
    } catch (error) {
      return clock.end(await this.refused({ row, error, attempts, now, line, route }));
    }
    const recordDeps = { queries: this.queries, wait: this.wait, log: this.log };
    await clock.record(() => recordSent(recordDeps, { row, sent }));
    await this.holds?.lift({ line, route, now });
    await this.outages?.lift({ line, route, now });
    return clock.end('sent');
  }

  private async refused(input: FailedInput): Promise<SendOutcome> {
    const held = isWindowClosedError(input.error) ? await this.window?.closed(input) : null;
    return held ?? this.failed(input);
  }

  private async failed(input: FailedInput): Promise<SendOutcome> {
    const { row, now, line } = input;
    const plan = await this.plan(input);
    await this.queries.failure(row.id, plan, ...unrecordedAt(input));
    await this.missing?.check({ key: row.template_key, line, error: input.error, now });
    const pause = pauseOf({ ...input, plan }) ?? (await this.timeouts(input));
    if (pause) return this.paused(row, pause);
    if (plan.status === 'queued') return 'retry';
    this.log.warn(`message ${row.id} failed: ${plan.error_code} ${plan.error_text}`);
    await failurePush(this.push, row, trySubject(row, now));
    return 'failed';
  }

  /** The lane waits for the rest of the pass; one push per line (number) and period. */
  private async paused(row: DueMessage, pause: Pause): Promise<SendOutcome> {
    if (pause.log) this.log.error(pause.log);
    if (pause.subject) await failurePush(this.push, row, pause.subject);
    return 'paused';
  }

  /** Timeouts in a row hold the lane; the timed-out row stays uncertain and is pushed itself. */
  private async timeouts(input: FailedInput): Promise<Pause | null> {
    if (!(await this.outages?.settle(input.error, input))) return null;
    await failurePush(this.push, input.row, trySubject(input.row, input.now));
    return timeoutPause(input);
  }

  /**
   * Not now: automatic messages OFF ('held'), its PDF not attached yet ('skipped'), or a 131042
   * line hold ('skipped': deferred; due 48 h ago: fails as 131042, pushed). null = send.
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
    if (check === 'deferred' || (await this.outages?.check(row, at)) === 'deferred') return 'skipped';
    if (check !== 'aged') return null;
    return this.failed({ ...at, row, error: PAYMENT_HOLD_EXPIRED, attempts: row.attempts });
  }

  /** The failure's plan; a template's 131042 also holds its line with this row as the probe. */
  private async plan(input: FailedInput): Promise<FailurePlan> {
    const plan = failurePlan(input);
    const paid = this.holds ? await this.holds.probe(plan, input) : plan;
    return this.outages ? this.outages.probe(paid, input) : paid;
  }

  release = (): Promise<number> => this.window?.release() ?? Promise.resolve(0);
  /** The pass's later rows of a paused line: deferred in one write while it is held. */
  async deferRest(probe: PassJob, rest: readonly DueMessage[]): Promise<void> {
    const { line } = sendingAt(probe, this.dispatch.multi);
    const at = { line, route: probe.route, now: probe.now };
    await this.holds?.deferRest(rest, at);
    await this.outages?.deferRest(rest, at);
  }
}
