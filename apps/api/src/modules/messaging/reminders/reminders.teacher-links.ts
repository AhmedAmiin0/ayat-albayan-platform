import { roomClosesAt, type JoinWindowConfig } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { TeacherReportLinks } from '@/modules/reporting/reports';
import { classroomUrl } from './plan/reminders.links';
import { isOpen, type ReminderLesson } from './plan/reminders.plan';
import { teacherReminderDue, type TeacherTiming } from './plan/teacher-due';
import type { TeacherLinks } from './plan/teacher-lesson.crm';

/** When the teacher reminders are due, and what our classroom page and its room window are. */
interface LinksAt extends TeacherTiming {
  origin: string;
  win: JoinWindowConfig;
}

/**
 * The teacher reminder's short links (owner 2026-11-05, docs/19), made only for the lessons whose
 * teacher reminder is due this tick: the no-login report link, and our classroom page when that is
 * the
 * lesson's link (a Meet or fixed link is sent as it is). Idempotent per lesson. A failure leaves
 * that
 * lesson's long links (logged): a reminder is never held back by a short link.
 */
@Injectable()
export class ReminderTeacherLinks {
  private readonly log = new Logger(ReminderTeacherLinks.name);

  constructor(private readonly links: TeacherReportLinks) {}

  /** `lessons` as sentLinks gives them: meeting_link = our classroom, a fixed link or null. */
  async build(lessons: readonly ReminderLesson[], at: LinksAt): Promise<Map<string, TeacherLinks>> {
    const due = lessons.filter((l) => isOpen(l.status) && teacherReminderDue(l, at));
    const pairs = await Promise.all(due.map(async (l) => [l.id, await this.one(l, at)] as const));
    return new Map(pairs);
  }

  private async one(lesson: ReminderLesson, ctx: LinksAt): Promise<TeacherLinks> {
    try {
      const [report, join] = await Promise.all([this.report(lesson), this.room(lesson, ctx)]);
      return { ...(report ? { report } : {}), ...(join ? { join } : {}) };
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      this.log.warn(`teacher reminder short links failed for lesson ${lesson.id}: ${why}`);
      return {};
    }
  }

  private report(lesson: ReminderLesson): Promise<string | null> {
    const teacherId = lesson.teacher?.id ?? '';
    return this.links.forLesson({ id: lesson.id, teacherId, ends_at: lesson.ends_at });
  }

  /** Our classroom page only (a Meet or fixed link is sent as it is); null otherwise. */
  private async room(lesson: ReminderLesson, ctx: LinksAt): Promise<string | null> {
    const url = classroomUrl(ctx.origin, lesson.id);
    if (lesson.meeting_link !== url) return null;
    const expiresAt = new Date(roomClosesAt(lesson, ctx.win));
    return this.links.classroom({ lessonId: lesson.id, url, expiresAt });
  }
}
