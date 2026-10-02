import ar from '@ab/shared/i18n/ar.json';
import { ALERT_TASK_KIND, alertDedupKey, packageProgress } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { AlertsQueries } from './alerts.queries';
import { alertPlan, type AlertPlan } from './packages.plan';
import { PackagesService } from './packages.service';

export type EvaluateOptions = { actorId?: string | null; now?: Date };

/**
 * R-SUB-02 «2 lessons remaining» → renewal reminder to the guardian + an admin task; at 0 the
 * newest package is `unpaid` (+ task, no WhatsApp: no approved template, TODO(R-MSG-01)).
 * Runs after every lesson change (AlertsJob subscribes to LessonEvents, incl. a submitted report),
 * every money write (MoneyWrites) and the sweep job. Idempotent: the task and the message carry
 * the same dedup key (rule 8).
 */
@Injectable()
export class SubscriptionAlertsService {
  private readonly log = new Logger(SubscriptionAlertsService.name);

  constructor(
    private readonly packages: PackagesService,
    private readonly queries: AlertsQueries,
    private readonly settings: SettingsService,
  ) {}

  async evaluateLessons(lessonIds: readonly string[]): Promise<void> {
    await this.evaluateStudents(await this.queries.studentsOfLessons(lessonIds));
  }

  /** Recompute statuses, then raise the alert. One student's failure never stops the others. */
  async evaluateStudents(studentIds: readonly string[], opts: EvaluateOptions = {}): Promise<number> {
    if (studentIds.length === 0) return 0;
    const { renewal_alert_remaining: threshold } = await this.settings.all();
    let failed = 0;
    for (const studentId of new Set(studentIds)) {
      try {
        const { rows, ctx } = await this.packages.recompute(studentId, opts.actorId ?? null);
        const plan = alertPlan({ subs: rows, balances: ctx.balances, threshold });
        if (plan) await this.raise({ studentId, plan, now: opts.now ?? new Date() });
      } catch (e) {
        failed += 1;
        this.log.error(`alerts failed for student ${studentId}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return failed;
  }

  private async raise(input: { studentId: string; plan: AlertPlan; now: Date }): Promise<void> {
    const { plan } = input;
    const dedupKey = alertDedupKey(plan.alert, plan.subscriptionId);
    const label = packageProgress(plan.used, plan.total, { forms: ar.subscriptions.progress }).remainingLabel;
    const kind = ALERT_TASK_KIND[plan.alert];
    await this.queries.raiseTask({ kind, subjectId: plan.subscriptionId, dedupKey, title: label });
    if (plan.alert !== 'renewal') return;
    const recipient = await this.queries.recipient(input.studentId);
    if (!recipient) return;
    // TODO(R-MSG-01): {{1}}/{{2}} against the approved renewal_due template.
    const params = { '1': recipient.studentName, '2': label };
    await this.queries.queueRenewal({ recipient, params, dedupKey, now: input.now });
  }
}
