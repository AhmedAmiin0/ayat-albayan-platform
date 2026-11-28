import { Inject, Injectable, Logger } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { NotificationPolicy } from '@/modules/messaging/notification-rules';
import { confirmationPush, needsConfirmation } from './plan/reminders.plan';
import type { ReminderLesson } from './plan/reminders.plan.types';
import { RemindersRepo } from './reminders.repo';
import { lookaheadHours, reminderRules } from './plan/reminders.rules';
import type { ReminderSummary } from './reminders.job.types';
import { ReminderQueue } from './reminders.queue';
import { RemindersSettings } from './reminders.settings';
import { Ticker, TickerJob } from '@/common/jobs';
import { BackgroundJob } from '@/config/role/background-job';

const MINUTE = 60_000;
/** R-MSG-02: every 5 minutes. */
const EVERY_MS = 5 * MINUTE;
const FIRST_RUN_MS = 30_000;
/**
 * How far back push_notifications is read to skip lessons already pushed (> any reminder window).
 */
const PUSHED_SINCE_MS = 48 * 60 * MINUTE;

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * R-MSG-02 reminder scheduler (docs/12 §7): every 5 minutes, single flight. Queues the same-day
 * reminder to each guardian (template by meeting link, time in the guardian's tz) and to the
 * teacher (teacher's tz); each row only while its notification rule is on (one NotificationPolicy
 * snapshot per tick; unreadable = nothing queued or pushed), the day-before one only once
 * lesson_reminder_24h is approved; nothing while settings.auto_messages_enabled is OFF. The link is
 * chosen here per lesson (its teacher's meeting_mode, else settings.meeting_link_auto;
 * reminders.links.ts): our classroom adds one lesson_join_link per student. Drops queued reminders
 * of lessons cancelled since, and pushes lesson_needs_confirmation (R-MOB-01) once per lesson (also
 * when OFF), only while settings.lesson_confirmation_required is ON. Only queues: the sender owns
 * the send gate.
 */
@BackgroundJob({ name: 'reminders' })
@Injectable()
export class RemindersJob extends TickerJob {
  private readonly log = new Logger(RemindersJob.name);
  protected readonly ticker = new Ticker({
    name: RemindersJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: RemindersRepo,
    private readonly settings: RemindersSettings,
    private readonly push: PushService,
    private readonly policy: NotificationPolicy,
  ) {
    super();
  }

  /** What this tick queues (property injection keeps the constructor at four). */
  @Inject(ReminderQueue) private readonly reminderQueue!: ReminderQueue;

  kick(): Promise<unknown> {
    return this.ticker.tick();
  }

  /** One pass. Never throws. */
  async runOnce(now = new Date()): Promise<ReminderSummary> {
    const summary: ReminderSummary = { lessons: 0, queued: 0, dropped: 0, pushed: 0 };
    try {
      await this.pass(now, summary);
    } catch (e) {
      this.log.error(`reminders run aborted: ${errorText(e)}`);
    }
    summary.dropped = await this.dropCancelled(now);
    const acted = summary.queued + summary.dropped + summary.pushed > 0;
    if (acted) this.log.log(`reminders: ${JSON.stringify(summary)}`);
    return summary;
  }

  private async pass(now: Date, summary: ReminderSummary): Promise<void> {
    const settings = await this.settings.read();
    const snap = await this.policy.snapshot();
    // Fail closed: rules unread (logged by the policy) = no reminder and no push this tick.
    if (!snap) throw new Error('notification rules unread: nothing queued or pushed');
    const rules = reminderRules(snap);
    // reminder_lookahead_hours (≥ 25), or 48 h while a fixed day-before hour is set.
    const hours = lookaheadHours(settings.reminder_lookahead_hours, rules);
    const until = new Date(now.getTime() + hours * 60 * MINUTE);
    const lessons = await this.queries.upcoming({ now, until });
    summary.lessons = lessons.length;
    // Automatic messages OFF (docs/09 cut-over: the old Apps Script still reminds): queue nothing.
    if (settings.auto_messages_enabled) {
      summary.queued = await this.reminderQueue.queue({ settings, rules, lessons, now });
    }
    if (rules.confirmPush && settings.lesson_confirmation_required) {
      const at = { now, minutesBefore: rules.minutesBefore };
      summary.pushed = await this.confirmations(lessons, at);
    }
  }

  /** Cleanup on its own: a failure here never keeps reminders from being queued. */
  private async dropCancelled(now: Date): Promise<number> {
    try {
      return await this.queries.dropCancelled(now);
    } catch (e) {
      this.log.warn(`dropping cancelled reminders failed: ${errorText(e)}`);
      return 0;
    }
  }

  private async confirmations(
    lessons: readonly ReminderLesson[],
    at: { now: Date; minutesBefore: number },
  ): Promise<number> {
    const due = needsConfirmation(lessons, at);
    if (due.length === 0) return 0;
    const since = new Date(at.now.getTime() - PUSHED_SINCE_MS);
    const done = await this.queries.pushedSubjects('lesson_needs_confirmation', since);
    const fresh = due.filter((l) => !done.has(l.id));
    for (const lesson of fresh) {
      await this.push.notifyAdmins('lesson_needs_confirmation', confirmationPush(lesson));
    }
    return fresh.length;
  }
}
