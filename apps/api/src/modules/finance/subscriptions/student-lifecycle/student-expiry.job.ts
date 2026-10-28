import { expiryMove } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { pendingSince } from './student-renewal.plan';
import { StudentExpiryQueries } from './student-expiry.queries';
import { StudentStatusQueries } from './student-status.queries';
import { SubscriptionsSettings } from '../subscriptions.settings';
import { BackgroundJob } from '../../../../config/role/background-job';

const DAY_MS = 86_400_000;
/** Not on boot: every API test boots AppModule, and a restart loop must not hammer the DB. */
const FIRST_RUN_MS = 10 * 60_000;

type ExpirySummary = { students: number; expired: number; failed: number };

/**
 * Transition 6 (owner 2026-10-15, docs/11 §7, R-STU-05): a student still «بانتظار التجديد»
 * settings.subscription_expiry_days days after it became so, with no positive payment since, becomes
 * «انتهى الاشتراك» (expired). Since = its newest status_change to pending_renewal. None (e.g. set
 * before the audit existed): the clock starts on first sight, an audited compare-and-set row
 * pending_renewal → pending_renewal (via expiry_clock_started), and it expires N days after that.
 * Compare-and-set pending_renewal → expired, audited with no actor (via subscription_expired), so it is
 * idempotent and a status set by hand meanwhile wins.
 * Sends nothing. A renewal payment later moves expired → active (StudentActivation / StudentRenewal).
 * ponytail: in-process daily timer on the single API instance, like HorizonJob; pg_cron when it scales.
 */
@BackgroundJob({ name: 'student-expiry' })
@Injectable()
export class StudentExpiryJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(StudentExpiryJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly queries: StudentExpiryQueries,
    private readonly statuses: StudentStatusQueries,
    private readonly settings: SubscriptionsSettings,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, DAY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** One pass over the pending_renewal students. Never throws: one bad student doesn't stop the others. */
  async runOnce(now = new Date()): Promise<ExpirySummary> {
    const summary: ExpirySummary = { students: 0, expired: 0, failed: 0 };
    try {
      const days = (await this.settings.read()).subscription_expiry_days;
      for (const id of await this.queries.pendingRenewal()) {
        summary.students += 1;
        try {
          if (await this.expire(id, { now, days })) summary.expired += 1;
        } catch (e) {
          summary.failed += 1;
          this.log.error(`expiry of student ${id} failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    } catch (e) {
      this.log.error(`student expiry aborted: ${String(e)}`);
    }
    return summary;
  }

  private async expire(studentId: string, o: { now: Date; days: number }): Promise<boolean> {
    const last = await this.statuses.lastStatusChange(studentId);
    const since = pendingSince(last);
    if (since === null) return this.startClock(studentId);
    const paidSince = await this.queries.paidSince(studentId, since);
    const plan = expiryMove({ current: 'pending_renewal', since, now: o.now, days: o.days, paidSince });
    if (!plan) return false;
    const after = { via: 'subscription_expired', from: plan.from, to: plan.to, reason: plan.reason };
    return this.statuses.move({ studentId, from: plan.from, to: plan.to }, { actorId: null, after });
  }

  /** No status_change row says since when: that row is written now (the clock starts); never expires now. */
  private async startClock(studentId: string): Promise<false> {
    const move = { studentId, from: 'pending_renewal', to: 'pending_renewal' } as const;
    await this.statuses.move(move, { actorId: null, after: { via: 'expiry_clock_started' } });
    return false;
  }
}
