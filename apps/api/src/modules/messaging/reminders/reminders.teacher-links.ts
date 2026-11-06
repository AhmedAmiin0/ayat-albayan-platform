import { Injectable, Logger } from '@nestjs/common';
import { TeacherLessonLinks } from '@/modules/teaching/lesson-links';
import { isOpen, type ReminderLesson } from './plan/reminders.plan';
import { teacherReminderDue, type TeacherTiming } from './plan/teacher-due';
import type { TeacherLinks } from './plan/teacher-lesson.crm';
import type { RemindersRepo } from './reminders.repo';

/**
 * The teacher reminder's signed links (owner 2026-11-06: no short links any more), made only for
 * the lessons whose teacher reminder is due this tick: the /join token and the no-login report
 * token and page. Stateless (nothing is written). A failure leaves that lesson without them
 * (logged): the reminder then goes as the older template with the signed-in report page.
 */
@Injectable()
export class ReminderTeacherLinks {
  private readonly log = new Logger(ReminderTeacherLinks.name);

  constructor(private readonly links: TeacherLessonLinks) {}

  async build(
    lessons: readonly ReminderLesson[],
    at: TeacherTiming,
  ): Promise<Map<string, TeacherLinks>> {
    const due = lessons.filter((l) => isOpen(l.status) && teacherReminderDue(l, at));
    const pairs = await Promise.all(due.map(async (l) => [l.id, await this.one(l)] as const));
    return new Map(pairs.flatMap(([id, links]) => (links ? [[id, links] as const] : [])));
  }

  private async one(lesson: ReminderLesson): Promise<TeacherLinks | null> {
    const teacherId = lesson.teacher?.id;
    if (!teacherId) return null;
    try {
      return await this.links.forLesson({ id: lesson.id, teacherId, ends_at: lesson.ends_at });
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      this.log.warn(`teacher reminder links failed for lesson ${lesson.id}: ${why}`);
      return null;
    }
  }
}

/** teacher_lesson_v3 approved: read only when a teacher reminder with its links is due. */
export async function v3Approved(
  repo: Pick<RemindersRepo, 'approved'>,
  links: ReadonlyMap<string, unknown> | undefined,
): Promise<boolean> {
  const due = (links?.size ?? 0) > 0;
  return due && (await repo.approved(['teacher_lesson_v3'])).has('teacher_lesson_v3');
}
