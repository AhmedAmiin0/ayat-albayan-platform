import { ar } from '@/common/infra/i18n/server-text';
import { ALERT_TASK_KIND, alertDedupKey, packageProgress } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { AlertsRepo } from './alerts.repo';
import { alertPlan, openTaskKeys, staleTaskKeys, type AlertPlan } from '@/modules/finance/subscriptions/money/packages.plan';
import { PackagesService, type StudentState } from '@/modules/finance/subscriptions/money/packages.service';
import { StudentRenewal } from '@/modules/finance/subscriptions/student-lifecycle/student-renewal';
import { SubscriptionsSettings } from '@/modules/finance/subscriptions/shared/subscriptions.settings';
import type { StudentTz } from '@/modules/finance/subscriptions/student-lifecycle/student-status.types';
import type { EvaluateOptions, Outcome, Run, Subject } from './alerts.types';


/**
 * R-SUB-02 «2 lessons remaining» → renewal reminder to the guardian + an admin task; at 0 the
 * newest package is `unpaid` (+ task; no unpaid WhatsApp: no approved template, TODO(R-MSG-01)).
 * A balance that skips the reminder (3 → 0 in one change set, a missed run) still sends the
 * renewal reminder once at 0 (same dedup key). Tasks the balance no longer calls for are closed.
 * Runs after every lesson change (AlertsJob subscribes to LessonEvents, incl. a submitted report),
 * every money write (MoneyWrites) and the sweep job. Idempotent: the task and the message carry
 * the same dedup key (rule 8).
 */
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
    private readonly queries: AlertsRepo,
    private readonly env: AlertsEnv,
  ) {}

  async evaluateLessons(lessonIds: readonly string[]): Promise<void> {
    await this.evaluateStudents(await this.queries.studentsOfLessons(lessonIds));
  }

  /** Batched reads for every student (BE-07); one student's failure never stops the others. */
  async evaluateStudents(studentIds: readonly string[], opts: EvaluateOptions = {}): Promise<number> {
    const ids = [...new Set(studentIds)];
    if (ids.length === 0) return 0;
    try {
      return await this.evaluateAll(ids, await this.runOf(opts));
    } catch (e) {
      this.log.error(`alerts failed for ${ids.length} students: ${messageOf(e)}`);
      return ids.length;
    }
  }

  private async runOf(opts: EvaluateOptions): Promise<Run> {
    const settings = await this.env.settings.read();
    return {
      actorId: opts.actorId ?? null,
      now: opts.now ?? new Date(),
      cause: opts.cause ?? { via: 'event' },
      threshold: settings.renewal_alert_remaining,
      auto: settings.auto_messages_enabled,
    };
  }

  private async evaluateAll(ids: readonly string[], run: Run): Promise<number> {
    const [states, students, open] = await Promise.all([
      this.packages.recomputeMany(ids, run.actorId),
      this.env.renewal.students(ids),
      this.queries.openTasks(),
    ]);
    const subjects = subjectsOf(ids, { states, students });
    const outcomes: Outcome[] = [];
    for (const subject of subjects) {
      const outcome = await this.evaluate(subject, run).catch((e: unknown) => this.failed(subject, e));
      outcomes.push(...outcome);
    }
    const subjectIds = new Set(outcomes.flatMap((o) => o.subjectIds));
    const keep = new Set(outcomes.flatMap((o) => o.keep));
    await this.queries.closeKeys(staleTaskKeys(open, { subjectIds, keep }), run.now);
    return subjects.length - outcomes.length;
  }

  private async evaluate(s: Subject, run: Run): Promise<Outcome[]> {
    const { rows, ctx } = s.state;
    const plan = alertPlan({ subs: rows, balances: ctx.balances, threshold: run.threshold });
    if (plan) await this.raise({ studentId: s.studentId, plan, now: run.now, auto: run.auto });
    const { student } = s;
    if (student) await this.env.renewal.apply({ ...s, student, actorId: run.actorId, now: run.now, cause: run.cause });
    return [{ subjectIds: rows.map((r) => r.id), keep: openTaskKeys(plan) }];
  }

  private failed(s: Subject, e: unknown): Outcome[] {
    this.log.error(`alerts failed for student ${s.studentId}: ${messageOf(e)}`);
    return [];
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

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function subjectsOf(
  ids: readonly string[],
  read: { states: ReadonlyMap<string, StudentState>; students: ReadonlyMap<string, StudentTz> },
): Subject[] {
  return ids.flatMap((studentId) => {
    const state = read.states.get(studentId);
    return state ? [{ studentId, student: read.students.get(studentId), state }] : [];
  });
}
