import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { LessonEvents, type ScheduleChange } from '@/common/events/lesson-events';
import { PushService } from '@/common/push/push.service';
import { NotificationPolicy } from '@/modules/messaging/notification-rules';
import { MessageSender } from '@/modules/messaging/whatsapp';
import { lessonNotice, pausedNotice, resumedNotice } from './notice.build';
import { planNotice } from './notice.plan';
import type { Notice } from './notice.types';
import { ScheduleNoticesRepo } from './schedule-notices.repo';

/** The shared services ScheduleNotices talks to (one injectable, so constructors stay small). */
@Injectable()
export class NoticeDeps {
  constructor(
    readonly push: PushService,
    readonly policy: NotificationPolicy,
    readonly sender: MessageSender,
  ) {}
}

/**
 * «if there is a reschedule, cancel or pause, continue event please notify both teacher and
 * student» (owner 2026-10-30). After a lesson writer commits (LessonEvents.scheduleChanged), the
 * lesson's teacher and the student's family hear it: the bell / push of each one with a profile
 * (never the person who made the change; PushService applies the row's rule) and one WhatsApp each
 * on the notifications line, queued only while the row's rule is on and its template approved
 * (never a free-text fallback). The sender owns the send gate (messaging_enabled). The row is not
 * automatic: auto_messages_enabled does not hold it. Never throws: the change is already saved.
 */
@Injectable()
export class ScheduleNotices implements OnModuleInit {
  private readonly log = new Logger(ScheduleNotices.name);

  constructor(
    private readonly repo: ScheduleNoticesRepo,
    private readonly deps: NoticeDeps,
    private readonly events: LessonEvents,
  ) {}

  onModuleInit(): void {
    this.events.onScheduleChange((change) => this.handle(change));
  }

  async handle(change: ScheduleChange, now = new Date()): Promise<void> {
    try {
      const notice = await this.read(change, now);
      if (notice) await this.send(notice, now);
    } catch (e) {
      this.log.warn(`${change.kind} notice failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async read(change: ScheduleChange, now: Date): Promise<Notice | null> {
    if (change.kind === 'lesson_rescheduled' || change.kind === 'lesson_cancelled') {
      const row = await this.repo.lesson(change.lessonId);
      return row ? lessonNotice(change, row) : null;
    }
    const student = await this.repo.student(change.studentId);
    if (!student) return null;
    if (change.kind === 'course_paused') {
      const lessons = await this.repo.lessons(change.lessonIds);
      return pausedNotice(change, { student, lessons, now });
    }
    const next = await this.repo.nextLesson(change.studentId, now);
    return resumedNotice(change, { student, next });
  }

  private async send(notice: Notice, now: Date): Promise<void> {
    const plan = planNotice(notice, now);
    for (const target of plan.pushes) await this.deps.push.notifyProfiles(target);
    if (plan.messages.length === 0) return;
    if (!(await this.deps.policy.channelOn(notice.key, 'whatsapp'))) return;
    if (!(await this.repo.approved(notice.key))) return;
    if ((await this.repo.queue(plan.messages)) > 0) void this.deps.sender.kick();
  }
}
