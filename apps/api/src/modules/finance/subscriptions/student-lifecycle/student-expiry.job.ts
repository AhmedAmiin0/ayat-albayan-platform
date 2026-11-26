import { errorMessage } from '@ab/core';
import { expiryMove } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { pendingSince } from './student-renewal.plan';
import { StudentExpiryRepo } from './student-expiry.repo';
import { StudentStatusRepo } from './student-status.repo';
import { SubscriptionsSettings } from '@/modules/finance/subscriptions/shared/subscriptions.settings';
import { Ticker, TickerJob } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';

const DAY_MS = 86_400_000;
/** Not on boot: every API test boots AppModule, and a restart loop must not hammer the DB. */
const FIRST_RUN_MS = 10 * 60_000;

interface ExpirySummary {
  students: number;
  expired: number;
  failed: number;
}
type Outcome = 'expired' | 'kept' | 'failed';

/** Transition 6 (docs/11 §7, R-STU-05): pending_renewal expires after the setting's days. */
@BackgroundJob({ name: 'student-expiry' })
@Injectable()
export class StudentExpiryJob extends TickerJob {
  private readonly log = new Logger(StudentExpiryJob.name);
  protected readonly ticker = new Ticker({
    name: StudentExpiryJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: DAY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: StudentExpiryRepo,
    private readonly statuses: StudentStatusRepo,
    private readonly settings: SubscriptionsSettings,
  ) {
    super();
  }

  /**
   * One pass over the pending_renewal students. Never throws: one bad student doesn't stop the
   * others.
   */
  async runOnce(now = new Date()): Promise<ExpirySummary> {
    const summary: ExpirySummary = { students: 0, expired: 0, failed: 0 };
    try {
      const days = (await this.settings.read()).subscription_expiry_days;
      for (const id of await this.queries.pendingRenewal()) {
        summary.students += 1;
        const outcome = await this.expireLogged(id, { now, days });
        summary.expired += Number(outcome === 'expired');
        summary.failed += Number(outcome === 'failed');
      }
    } catch (e) {
      this.log.error(`student expiry aborted: ${String(e)}`);
    }
    return summary;
  }

  /** One student's pass; a failure is logged and counted, never thrown. */
  private async expireLogged(studentId: string, o: { now: Date; days: number }): Promise<Outcome> {
    try {
      return (await this.expire(studentId, o)) ? 'expired' : 'kept';
    } catch (e) {
      this.log.error(`expiry of student ${studentId} failed: ${errorMessage(e)}`);
      return 'failed';
    }
  }

  private async expire(studentId: string, o: { now: Date; days: number }): Promise<boolean> {
    const last = await this.statuses.lastStatusChange(studentId);
    const since = pendingSince(last);
    if (since === null) return this.startClock(studentId);
    const paidSince = await this.queries.paidSince(studentId, since);
    const plan = expiryMove({ current: 'pending_renewal', since, now: o.now, days: o.days, paidSince });
    if (!plan) return false;
    const after = { via: 'subscription_expired', from: plan.from, to: plan.to, reason: plan.reason };
    const move = { studentId, from: plan.from, to: plan.to };
    return this.statuses.move(move, { actorId: null, after });
  }

  /**
   * No status_change row says since when: that row is written now (the clock starts); never expires
   * now.
   */
  private async startClock(studentId: string): Promise<false> {
    const move = { studentId, from: 'pending_renewal', to: 'pending_renewal' } as const;
    await this.statuses.move(move, { actorId: null, after: { via: 'expiry_clock_started' } });
    return false;
  }
}
