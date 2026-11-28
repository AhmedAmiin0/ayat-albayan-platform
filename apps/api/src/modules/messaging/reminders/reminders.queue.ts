import { joinWindowConfig } from '@ab/schedule';
import { Injectable, Logger } from '@nestjs/common';
import { livekitEnv, loadEnv } from '@/config/env/env';
import type { QueuedMessage } from './queued-row';
import {
  joinCandidates,
  sentLinks,
  type RoomCandidate,
  type RoomContext,
} from './plan/reminders.links';
import { planReminders } from './plan/reminders.plan';
import { wantedTemplates } from './plan/reminders.templates';
import type { QueueInput } from './reminders.job.types';
import { RemindersRepo } from './reminders.repo';
import { ReminderTeacherLinks, v3Approved } from './reminders.teacher-links';

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** The rows one RemindersJob tick queues: the reminders and the families' classroom links. */
@Injectable()
export class ReminderQueue {
  private readonly log = new Logger(ReminderQueue.name);

  constructor(
    private readonly queries: RemindersRepo,
    private readonly teacherLinks: ReminderTeacherLinks,
  ) {}

  /**
   * This tick's reminders, with the link each lesson's teacher mode picks (ctx.auto = the academy
   * default), and the families' own classroom links. LiveKit and the origin are read every tick.
   */
  async queue({ settings, rules, lessons, now, origin }: QueueInput): Promise<number> {
    const env = loadEnv();
    const livekit = livekitEnv(env) !== null;
    const wanted = wantedTemplates(rules, livekit);
    const approved = wanted.length > 0 ? await this.queries.approved(wanted) : new Set<string>();
    const ctx: RoomContext = {
      auto: settings.meeting_link_auto,
      livekit,
      joinOk: approved.has('lesson_join_link'),
      origin,
    };
    const { minutesBefore, sameDay, dayBeforeAt, teacherMinutesBefore } = rules;
    const plan = { minutesBefore, sameDay, dayBeforeAt, teacherMinutesBefore, origin: ctx.origin };
    const sent = sentLinks(lessons, ctx);
    const win = joinWindowConfig(settings);
    const at = { minutesBefore, teacherMinutesBefore, now, origin: ctx.origin, win };
    const teacherLinks = rules.teacher ? await this.teacherLinks.build(sent, at) : undefined;
    const teacherV3 = await v3Approved(this.queries, teacherLinks);
    const dayBefore = approved.has('lesson_reminder_24h');
    const links = { teacherReminders: rules.teacher, teacherLinks, teacherV3 };
    const rows = planReminders({ ...plan, ...links, lessons: sent, dayBefore, now });
    const candidates = joinCandidates(lessons, ctx, { now, minutesBefore, win });
    return this.queries.queue([...rows, ...(await this.roomLinks(candidates, now))]);
  }

  /**
   * The families' links on their own: a failure here never keeps the reminders from being queued
   * (next tick retries).
   */
  private async roomLinks(
    candidates: readonly RoomCandidate[],
    now: Date,
  ): Promise<QueuedMessage[]> {
    try {
      return await this.queries.roomLinks(candidates, now);
    } catch (e) {
      this.log.warn(`family classroom links failed: ${errorText(e)}`);
      return [];
    }
  }
}
