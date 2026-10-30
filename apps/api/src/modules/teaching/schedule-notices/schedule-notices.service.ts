import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { LessonEvents, type ScheduleChange } from '@/common/events/lesson-events';
import { PushService } from '@/common/push/push.service';
import { MessageSender } from '@/modules/messaging/whatsapp';
import { lessonNotice, pausedNotice, resumedNotice } from './notice.build';
import { NoticeGate } from './notice.gate';
import { planNotice } from './notice.plan';
import type { Notice } from './notice.types';
import { ScheduleNoticesRepo } from './schedule-notices.repo';

/** The shared services ScheduleNotices talks to (one injectable, so constructors stay small). */
@Injectable()
export class NoticeDeps {
  constructor(
    readonly push: PushService,
    readonly gate: NoticeGate,
    readonly sender: MessageSender,
  ) {}
}

/**
 * «if there is a reschedule, cancel or pause, continue event please notify both teacher and
 * student» (owner 2026-10-30). After a lesson writer commits (LessonEvents.scheduleChanged), the
 * lesson's teacher and the student's family hear it: the bell / push of each one with a profile
 * (never the person who made the change; PushService applies the row's rule) and one WhatsApp each
 * on the notifications line, queued only while the row's rule is on and its template approved
 * (NoticeGate; never a free-text fallback). A move's family WhatsApp goes only when
 * FamilyMoveNotice chose it over the booking confirmation (one family message). The sender owns the send gate (messaging_enabled). The row is not
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
    // The first lesson back of the course this pause held (its rules), not any course.
    const ruleIds = await this.repo.pauseRules(change.pauseId);
    const next = await this.repo.nextLesson({ studentId: change.studentId, ruleIds, after: now });
    return resumedNotice(change, { student, next });
  }

  private async send(notice: Notice, now: Date): Promise<void> {
    const plan = planNotice(notice, now);
    for (const target of plan.pushes) await this.deps.push.notifyProfiles(target);
    if (plan.messages.length === 0) return;
    if (!promised(notice) && !(await this.deps.gate.usable(notice.key))) return;
    if ((await this.repo.queue(plan.messages)) > 0) void this.deps.sender.kick();
  }
}

/**
 * A move whose family FamilyMoveNotice promised lesson_rescheduled: the gate passed then and their
 * booking confirmation was dropped, so it is not asked again (the family hears the move once).
 */
const promised = (n: Notice): boolean => n.key === 'lesson_rescheduled' && n.familyWhatsApp;
