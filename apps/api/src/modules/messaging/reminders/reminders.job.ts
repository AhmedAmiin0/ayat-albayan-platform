import { joinWindowConfig, type TemplateKey } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { livekitEnv, loadEnv } from '../../../config/env/env';
import { firstWebOrigin } from '../../teaching/classroom/classroom.config';
import type { QueuedMessage } from './queued-row';
import { RemindersDeps } from './reminders.deps';
import { joinCandidates, sentLinks, type RoomCandidate, type RoomContext } from './plan/reminders.links';
import { confirmationPush, needsConfirmation, planReminders, type ReminderLesson } from './plan/reminders.plan';
import { RemindersQueries } from './reminders.queries';
import { lookaheadHours, reminderRules, type ReminderRules } from './plan/reminders.rules';
import { RemindersSettings, type RemindersSettingsValues } from './reminders.settings';
import { Ticker } from './ticker';
import { BackgroundJob } from '../../../config/role/background-job';

const MINUTE = 60_000;
/** R-MSG-02: every 5 minutes. */
const EVERY_MS = 5 * MINUTE;
const FIRST_RUN_MS = 30_000;
/** How far back push_notifications is read to skip lessons already pushed (> any reminder window). */
const PUSHED_SINCE_MS = 48 * 60 * MINUTE;

export type ReminderSummary = { lessons: number; queued: number; dropped: number; pushed: number };
type QueueInput = { settings: RemindersSettingsValues; rules: ReminderRules; lessons: readonly ReminderLesson[]; now: Date };

/**
 * R-MSG-02 reminder scheduler (docs/12 §7): every 5 minutes, single flight. Queues the same-day
 * reminder to each guardian (template by meeting link, time in the guardian's tz) and to the
 * teacher (teacher's tz); each row only while its notification rule is on (one NotificationPolicy
 * snapshot per tick; unreadable = nothing queued or pushed), the day-before one only once
 * lesson_reminder_24h is approved; nothing while settings.auto_messages_enabled is OFF. The link is
 * chosen here per lesson (its teacher's meeting_mode, else settings.meeting_link_auto; reminders.links.ts): our classroom adds one
 * lesson_join_link per student. Drops queued reminders of lessons cancelled since, and pushes
 * lesson_needs_confirmation (R-MOB-01) once per lesson (also when OFF). Only queues: the sender owns
 * the send gate.
 */
@BackgroundJob({ name: 'reminders' })
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
    private readonly settings: RemindersSettings,
    private readonly deps: RemindersDeps,
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
      const settings = await this.settings.read();
      const snap = await this.deps.policy.snapshot();
      // Fail closed: rules unread (logged by the policy) = no reminder and no push this tick; the next retries.
      if (!snap) throw new Error('notification rules unread: nothing queued or pushed');
      const rules = reminderRules(snap);
      // reminder_lookahead_hours (≥ 25), or 48 h while a fixed day-before hour (send_at_local) is set.
      const until = new Date(now.getTime() + lookaheadHours(settings.reminder_lookahead_hours, rules) * 60 * MINUTE);
      const lessons = await this.queries.upcoming({ now, until });
      summary.lessons = lessons.length;
      // Automatic messages OFF (docs/09 cut-over: the old Apps Script still reminds): queue nothing.
      if (settings.auto_messages_enabled) summary.queued = await this.queue({ settings, rules, lessons, now });
      if (rules.confirmPush) summary.pushed = await this.confirmations(lessons, { now, minutesBefore: rules.minutesBefore });
    } catch (e) {
      this.log.error(`reminders run aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    summary.dropped = await this.dropCancelled(now);
    if (summary.queued + summary.dropped + summary.pushed > 0) this.log.log(`reminders: ${JSON.stringify(summary)}`);
    return summary;
  }

  /**
   * This tick's reminders, with the link each lesson's teacher mode picks (ctx.auto = the academy default), and the families' own
   * classroom links. LiveKit and the origin are read every tick (the integration config may change).
   * A template is looked up only when it could be used.
   */
  private async queue({ settings, rules, lessons, now }: QueueInput): Promise<number> {
    const env = loadEnv();
    const livekit = livekitEnv(env) !== null;
    const wanted: TemplateKey[] = [];
    if (rules.dayBefore) wanted.push('lesson_reminder_24h');
    if (livekit && rules.joinLink) wanted.push('lesson_join_link');
    const approved = wanted.length > 0 ? await this.queries.approved(wanted) : new Set<string>();
    const ctx: RoomContext = { auto: settings.meeting_link_auto, livekit, joinOk: approved.has('lesson_join_link'), origin: firstWebOrigin(env.WEB_ORIGIN) };
    const { minutesBefore, sameDay, dayBeforeAt, teacherMinutesBefore } = rules;
    const plan = { minutesBefore, sameDay, dayBeforeAt, teacherReminders: rules.teacher, teacherMinutesBefore, origin: ctx.origin };
    const rows = planReminders({ ...plan, lessons: sentLinks(lessons, ctx), dayBefore: approved.has('lesson_reminder_24h'), now });
    const candidates = joinCandidates(lessons, ctx, { now, minutesBefore, win: joinWindowConfig(settings) });
    return this.queries.queue([...rows, ...(await this.roomLinks(candidates, now))]);
  }

  /** The families' links on their own: a failure here never keeps the reminders from being queued (next tick retries). */
  private async roomLinks(candidates: readonly RoomCandidate[], now: Date): Promise<QueuedMessage[]> {
    try {
      return await this.queries.roomLinks(candidates, now);
    } catch (e) {
      this.log.warn(`family classroom links failed: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  /** Cleanup on its own: a failure here never keeps reminders from being queued. */
  private async dropCancelled(now: Date): Promise<number> {
    try {
      return await this.queries.dropCancelled(now);
    } catch (e) {
      this.log.warn(`dropping cancelled reminders failed: ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    }
  }

  private async confirmations(lessons: readonly ReminderLesson[], at: { now: Date; minutesBefore: number }): Promise<number> {
    const due = needsConfirmation(lessons, at);
    if (due.length === 0) return 0;
    const since = new Date(at.now.getTime() - PUSHED_SINCE_MS);
    const done = await this.queries.pushedSubjects('lesson_needs_confirmation', since);
    const fresh = due.filter((l) => !done.has(l.id));
    for (const lesson of fresh) await this.deps.push.notifyAdmins('lesson_needs_confirmation', confirmationPush(lesson));
    return fresh.length;
  }
}
