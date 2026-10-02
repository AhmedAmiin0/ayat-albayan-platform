import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import { SettingsService } from '../../common/settings/settings.service';
import { confirmationPush, needsConfirmation, planReminders, type ReminderLesson } from './reminders.plan';
import { RemindersQueries } from './reminders.queries';
import { Ticker } from './ticker';

const MINUTE = 60_000;
/** R-MSG-02: every 5 minutes. */
const EVERY_MS = 5 * MINUTE;
const FIRST_RUN_MS = 30_000;
/** The day-before send time is 23–25 h ahead across DST; the confirmation push looks 24 h ahead. */
const LOOKAHEAD_MS = 25 * 60 * MINUTE;
/** How far back push_notifications is read to skip lessons already pushed (> the 24 h window). */
const PUSHED_SINCE_MS = 48 * 60 * MINUTE;

export type ReminderSummary = { lessons: number; queued: number; dropped: number; pushed: number };

/**
 * R-MSG-02 reminder scheduler (docs/12 §7): every 5 minutes, single flight. Queues the same-day
 * reminder to each guardian (template by meeting link, time in the guardian's tz) and to the
 * teacher (teacher's tz); the day-before one only when settings.reminder_24h_enabled and
 * lesson_reminder_24h is approved. Drops queued reminders of lessons cancelled since, and pushes
 * lesson_needs_confirmation (R-MOB-01) once per lesson. Only queues: the sender owns the send gate.
 */
@Injectable()
export class RemindersJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(RemindersJob.name);
  private readonly ticker = new Ticker({
    name: RemindersJob.name,
    firstMs: FIRST_RUN_MS,
    everyMs: EVERY_MS,
    run: () => this.runOnce(),
  });

  constructor(
    private readonly queries: RemindersQueries,
    private readonly settings: SettingsService,
    private readonly push: PushService,
  ) {}

  onApplicationBootstrap(): void {
    this.ticker.start();
  }

  onModuleDestroy(): void {
    this.ticker.stop();
  }

  /** Run now (single flight). */
  kick(): Promise<unknown> {
    return this.ticker.tick();
  }

  /** One pass. Never throws. */
  async runOnce(now = new Date()): Promise<ReminderSummary> {
    const summary: ReminderSummary = { lessons: 0, queued: 0, dropped: 0, pushed: 0 };
    try {
      const settings = await this.settings.all();
      summary.dropped = await this.queries.dropCancelled(now);
      const lessons = await this.queries.upcoming({ now, until: new Date(now.getTime() + LOOKAHEAD_MS) });
      summary.lessons = lessons.length;
      const dayBefore =
        settings.reminder_24h_enabled && (await this.queries.approved(['lesson_reminder_24h'])).has('lesson_reminder_24h');
      const rows = planReminders({ lessons, minutesBefore: settings.reminder_minutes_before, dayBefore, now });
      summary.queued = await this.queries.queue(rows);
      summary.pushed = await this.confirmations(lessons, now);
    } catch (e) {
      this.log.error(`reminders run aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (summary.queued + summary.dropped + summary.pushed > 0) this.log.log(`reminders: ${JSON.stringify(summary)}`);
    return summary;
  }

  private async confirmations(lessons: readonly ReminderLesson[], now: Date): Promise<number> {
    const due = needsConfirmation(lessons, now);
    if (due.length === 0) return 0;
    const done = await this.queries.pushedSubjects('lesson_needs_confirmation', new Date(now.getTime() - PUSHED_SINCE_MS));
    const fresh = due.filter((l) => !done.has(l.id));
    for (const lesson of fresh) await this.push.notifyAdmins('lesson_needs_confirmation', confirmationPush(lesson));
    return fresh.length;
  }
}
