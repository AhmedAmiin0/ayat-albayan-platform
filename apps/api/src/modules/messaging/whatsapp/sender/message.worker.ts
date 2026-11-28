import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { sleep } from '@/common/infra/cache/sleep';
import { PushService } from '@/common/push/push.service';
import { LineOutages } from './hold/line-outages';
import { PAYMENT_HOLD_EXPIRED } from './hold/payment-hold';
import { PaymentHolds, type HoldAt } from './hold/payment-holds';
import { deferHeld, heldPlan, liftHolds, lineHoldCheck } from './hold/worker-holds';
import { dropRow } from './plan/drop-row';
import { MessageDispatch } from './message.dispatch';
import { claimRow, sendingAt, UNRECORDED, unrecordedAt, type FailedInput, type PassJob, type SendJob, type SendOutcome } from './message.job';
import { failurePush, pauseOf, timeoutPause, trySubject, type Pause } from './pause';
import { readyToSend, SENDING } from './send-plan';
import { AUTO_OFF } from './send-stale';
import { autoHeld } from './plan/automatic';
import { SenderRepo, type DueMessage } from './sender.repo';
import { TemplateMissing } from '@/modules/messaging/whatsapp/templates/check/template-missing';
import { isWindowClosedError, WindowHold } from './window/window-hold';
import { EvolutionPaceRepo } from './pace';
import { recordSent, SendClock } from './pass';
import type { WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { WaLine } from '@ab/catalog';

export type { PassJob, SendJob } from './message.job';

type SendingAt = ReturnType<typeof sendingAt>;

/** One queued row (docs/12 §3.3): the window hold (window/), expiry, staleness, auto_off, the
 * 131042 and outage holds (hold/), claim, send, outcome. Never throws; claims compare-and-set. */
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

  process(job: SendJob): Promise<SendOutcome> {
    return this.run(job).catch((e: unknown): SendOutcome => {
      this.log.error(`message ${job.row.id}: ${e instanceof Error ? e.message : String(e)}`);
      return 'skipped';
    });
  }

  private async run(job: SendJob): Promise<SendOutcome> {
    const at = sendingAt(job, this.dispatch.multi);
    return (await this.beforeClaim(job, at.line)) ?? this.claimAndSend(job, at);
  }

  /** Held for the window, dropped, never recorded, or not now; null = claim and send it. */
  private async beforeClaim(job: SendJob, line: WaLine): Promise<SendOutcome | null> {
    const { row, now, route } = job;
    const held = await this.window?.due({ row, now, line, route });
    if (held) return held;
    const drop = await dropRow(this.queries, row, now);
    if (drop) return drop;
    if (row.error_code === SENDING)
      return this.failed({ row, error: UNRECORDED, attempts: row.attempts, now, line, route });
    return this.notNow(job, { line, route, now });
  }

  private async claimAndSend(job: SendJob, { line, via }: SendingAt): Promise<SendOutcome> {
    const { row, template, now, route } = job;
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
    await liftHolds(this.lineHolds, { line, route, now });
    return clock.end('sent');
  }

  private async refused(input: FailedInput): Promise<SendOutcome> {
    const held = isWindowClosedError(input.error) ? await this.window?.closed(input) : null;
    return held ?? this.failed(input);
  }

  private async failed(input: FailedInput): Promise<SendOutcome> {
    const { row, now, line } = input;
    const plan = await heldPlan(this.lineHolds, input);
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

  /** Not now: automatic messages OFF ('held'), its PDF not attached ('skipped'), or a line hold
   * ('skipped': deferred; a 131042 due 48 h ago fails as 131042, pushed). null = send. */
  private async notNow(job: SendJob, at: HoldAt): Promise<SendOutcome | null> {
    const { row } = job;
    // Not left queued: it would go out at a wrong time once the switch is back ON. No push.
    if (autoHeld(job)) {
      await this.queries.expire(row.id, AUTO_OFF);
      return 'held';
    }
    if (!readyToSend(row, job.template)) return 'skipped';
    const check = await lineHoldCheck(this.lineHolds, row, at);
    if (check === 'aged') {
      return this.failed({ ...at, row, error: PAYMENT_HOLD_EXPIRED, attempts: row.attempts });
    }
    return check === 'deferred' ? 'skipped' : null;
  }

  private get lineHolds(): { holds?: PaymentHolds; outages?: LineOutages } {
    return { holds: this.holds, outages: this.outages };
  }

  release = (): Promise<number> => this.window?.release() ?? Promise.resolve(0);
  /** The pass's later rows of a paused line: deferred in one write while it is held. */
  async deferRest(probe: PassJob, rest: readonly DueMessage[]): Promise<void> {
    const { line } = sendingAt(probe, this.dispatch.multi);
    await deferHeld(this.lineHolds, rest, { line, route: probe.route, now: probe.now });
  }
}
