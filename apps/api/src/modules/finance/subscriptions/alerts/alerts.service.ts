import { ar } from '../../../../common/i18n/server-text';
import { ALERT_TASK_KIND, alertDedupKey, packageProgress } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../../../common/push/push.service';
import { AlertsQueries } from './alerts.queries';
import { alertPlan, openTaskKeys, type AlertPlan } from '../money/packages.plan';
import { PackagesService } from '../money/packages.service';
import { StudentRenewal, type RenewalCause } from '../student-lifecycle/student-renewal';
import { SubscriptionsSettings } from '../subscriptions.settings';

type EvaluateOptions = { actorId?: string | null; now?: Date; cause?: RenewalCause };

/**
 * R-SUB-02 «2 lessons remaining» → renewal reminder to the guardian + an admin task; at 0 the
 * newest package is `unpaid` (+ task; no unpaid WhatsApp: no approved template, TODO(R-MSG-01)).
 * A balance that skips the reminder (3 → 0 in one change set, a missed run) still sends the
 * renewal reminder once at 0 (same dedup key). Tasks the balance no longer calls for are closed.
 * Runs after every lesson change (AlertsJob subscribes to LessonEvents, incl. a submitted report),
 * every money write (MoneyWrites) and the sweep job. Idempotent: the task and the message carry
 * the same dedup key (rule 8).
 */
/** What the alerts read (the threshold), whom they tell (R-MOB-01 payment_due), the student status rule; max-params. */
@Injectable()
export class AlertsEnv {
  constructor(
    readonly settings: SubscriptionsSettings,
    readonly push: PushService,
    readonly renewal: StudentRenewal,
  ) {}
}

@Injectable()
export class SubscriptionAlertsService {
  private readonly log = new Logger(SubscriptionAlertsService.name);

  constructor(
    private readonly packages: PackagesService,
    private readonly queries: AlertsQueries,
    private readonly env: AlertsEnv,
  ) {}

  async evaluateLessons(lessonIds: readonly string[]): Promise<void> {
    await this.evaluateStudents(await this.queries.studentsOfLessons(lessonIds));
  }

  /**
   * Recompute statuses, then raise the alert, then the student's «بانتظار التجديد» rule (StudentRenewal).
   * One student's failure never stops the others.
   */
  async evaluateStudents(studentIds: readonly string[], opts: EvaluateOptions = {}): Promise<number> {
    if (studentIds.length === 0) return 0;
    const { renewal_alert_remaining: threshold, auto_messages_enabled: auto } = await this.env.settings.read();
    const actorId = opts.actorId ?? null;
    const cause = opts.cause ?? { via: 'event' };
    let failed = 0;
    for (const studentId of new Set(studentIds)) {
      try {
        const state = await this.packages.recompute(studentId, actorId);
        const { rows, ctx } = state;
        const plan = alertPlan({ subs: rows, balances: ctx.balances, threshold });
        const now = opts.now ?? new Date();
        if (plan) await this.raise({ studentId, plan, now, auto });
        await this.queries.closeTasks({ subjectIds: rows.map((r) => r.id), keep: openTaskKeys(plan), now });
        await this.env.renewal.apply({ studentId, state, actorId, now, cause });
      } catch (e) {
        failed += 1;
        this.log.error(`alerts failed for student ${studentId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return failed;
  }

  /** auto = settings.auto_messages_enabled: OFF raises the task and the push but queues no renewal_due. */
  private async raise(input: { studentId: string; plan: AlertPlan; now: Date; auto: boolean }): Promise<void> {
    const { plan } = input;
    const dedupKey = alertDedupKey(plan.alert, plan.subscriptionId);
    const label = packageProgress(plan.used, plan.total, { forms: ar.subscriptions.progress }).remainingLabel;
    const kind = ALERT_TASK_KIND[plan.alert];
    const raised = await this.queries.raiseTask({ kind, subjectId: plan.subscriptionId, dedupKey, title: label });
    const recipient = await this.queries.recipient(input.studentId);
    if (raised) {
      const vars = { student: recipient?.studentName ?? '', left: label };
      const data = { subscriptionId: plan.subscriptionId, studentId: input.studentId };
      await this.env.push.notifyAdmins('payment_due', { subject: dedupKey, vars, data });
    }
    if (!recipient || !input.auto) return; // no guardian, or automatic messages OFF (docs/09 cut-over)
    // TODO(R-MSG-01): {{1}}/{{2}} against the approved renewal_due template.
    const params = { '1': recipient.studentName, '2': label };
    const renewalKey = alertDedupKey('renewal', plan.subscriptionId);
    await this.queries.queueRenewal({ recipient, params, dedupKey: renewalKey, now: input.now });
  }

  /** A deleted package: its open tasks have nothing left to point at. */
  async closeTasksOf(subscriptionId: string, now = new Date()): Promise<void> {
    await this.queries.closeTasks({ subjectIds: [subscriptionId], keep: [], now });
  }
}
