import { lessonWhenText, RIYADH_TZ } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { PushService, type PushEvent } from '@/common/push/push.service';
import { fill } from '@/modules/reporting/report-pdf';
import { studentIdsOf, type LessonRow } from '@/modules/teaching/lessons/store/lesson-row';
import { TeacherCancelRepo } from './teacher-cancel.repo';

/** The admins' and owners' push of a teacher's cancel: who, which lesson, and her reason. */
export function teacherCancelEvent(lesson: LessonRow, reason: string): PushEvent {
  const text = ar.teacherBoard.push;
  const names = lesson.lesson_students.map((s) => s.student?.name ?? '').filter(Boolean);
  const when = lessonWhenText(new Date(lesson.starts_at), RIYADH_TZ);
  return {
    subject: `teacher_cancel:${lesson.id}`,
    title: fill(text.title, { teacher: lesson.teacher?.display_name_ar ?? '' }),
    vars: { student: names.join('، '), when: `${when}. ${fill(text.reason, { reason })}` },
    data: { lessonId: lesson.id },
  };
}

/**
 * docs/46 D3: after a teacher cancels, the admins and the students' own assistant(s) get a push
 * with the reason (kind lesson_cancelled, its notification rule applies). No owner → no sales push
 * (never every assistant). Never throws: the cancel is already saved.
 */
@Injectable()
export class TeacherCancelPush {
  private readonly log = new Logger(TeacherCancelPush.name);

  constructor(
    private readonly push: PushService,
    private readonly repo: TeacherCancelRepo,
  ) {}

  async notify(lesson: LessonRow, reason: string): Promise<void> {
    const event = teacherCancelEvent(lesson, reason);
    await this.push.notifyAdmins('lesson_cancelled', event);
    try {
      const owners = await this.repo.ownerIds(studentIdsOf(lesson));
      if (owners.length === 0) return;
      await this.push.notifySales('lesson_cancelled', event, owners);
    } catch (e) {
      this.log.warn(`teacher cancel ${lesson.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
