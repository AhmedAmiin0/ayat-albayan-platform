import { joinWindowConfig, type AcademySettings, type TemplateKey } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import { SettingsService } from '../../common/settings/settings.service';
import { livekitEnv, loadEnv } from '../../env';
import { firstWebOrigin } from '../classroom/classroom.config';
import type { QueuedMessage } from './queued-row';
import { joinCandidates, sentLinks, type RoomCandidate, type RoomContext } from './reminders.links';
import { confirmationPush, needsConfirmation, planReminders, type ReminderLesson } from './reminders.plan';
import { RemindersQueries } from './reminders.queries';
import { Ticker } from './ticker';

const MINUTE = 60_000;
/** R-MSG-02: every 5 minutes. */
const EVERY_MS = 5 * MINUTE;
const FIRST_RUN_MS = 30_000;
/** How far back push_notifications is read to skip lessons already pushed (> any reminder window). */
const PUSHED_SINCE_MS = 48 * 60 * MINUTE;

export type ReminderSummary = { lessons: number; queued: number; dropped: number; pushed: number };
type QueueInput = { settings: AcademySettings; lessons: readonly ReminderLesson[]; now: Date };

/**
 * R-MSG-02 reminder scheduler (docs/12 §7): every 5 minutes, single flight. Queues the same-day
 * reminder to each guardian (template by meeting link, time in the guardian's tz) and to the
 * teacher (teacher's tz); the day-before one only when settings.reminder_24h_enabled and
 * lesson_reminder_24h is approved; nothing while settings.auto_messages_enabled is OFF. The link is
 * chosen here (settings.meeting_link_auto, reminders.links.ts): our classroom adds one
 * lesson_join_link per student. Drops queued reminders of lessons cancelled since, and pushes
 * lesson_needs_confirmation (R-MOB-01) once per lesson (also when OFF). Only queues: the sender owns
 * the send gate.
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
      // settings.reminder_lookahead_hours (≥ 25): the day-before send time is 23–25 h ahead across DST.
      const until = new Date(now.getTime() + settings.reminder_lookahead_hours * 60 * MINUTE);
      const lessons = await this.queries.upcoming({ now, until });
      summary.lessons = lessons.length;
      // Automatic messages OFF (docs/09 cut-over: the old Apps Script still reminds): queue nothing.
      if (settings.auto_messages_enabled) summary.queued = await this.queue({ settings, lessons, now });
      summary.pushed = await this.confirmations(lessons, { now, minutesBefore: settings.reminder_minutes_before });
    } catch (e) {
      this.log.error(`reminders run aborted: ${e instanceof Error ? e.message : String(e)}`);
    }
    summary.dropped = await this.dropCancelled(now);
    if (summary.queued + summary.dropped + summary.pushed > 0) this.log.log(`reminders: ${JSON.stringify(summary)}`);
    return summary;
  }

  /**
   * This tick's reminders, with the link settings.meeting_link_auto picks, and the families' own
   * classroom links. LiveKit and the origin are read every tick (the integration config may change).
   * A template is looked up only when it could be used.
   */
  private async queue({ settings, lessons, now }: QueueInput): Promise<number> {
    const env = loadEnv();
    const livekit = livekitEnv(env) !== null;
    const wanted: TemplateKey[] = [];
    if (settings.reminder_24h_enabled) wanted.push('lesson_reminder_24h');
    if (livekit) wanted.push('lesson_join_link');
    const approved = wanted.length > 0 ? await this.queries.approved(wanted) : new Set<string>();
    const ctx: RoomContext = { auto: settings.meeting_link_auto, livekit, joinOk: approved.has('lesson_join_link'), origin: firstWebOrigin(env.WEB_ORIGIN) };
    const minutesBefore = settings.reminder_minutes_before;
    const dayBefore = approved.has('lesson_reminder_24h');
    const rows = planReminders({ lessons: sentLinks(lessons, ctx), minutesBefore, dayBefore, now });
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
    for (const lesson of fresh) await this.push.notifyAdmins('lesson_needs_confirmation', confirmationPush(lesson));
    return fresh.length;
  }
}
