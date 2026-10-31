import { Injectable } from '@nestjs/common';
import { LessonEvents, type ScheduleChange } from '@/common/events/lesson-events';
import { TeacherAlert } from '@/modules/teaching/booking/teacher/teacher-alert.service';
import { FamilyMoveNotice } from '@/modules/teaching/schedule-notices';
import { courseChanges, courseMove, earliest, type CourseTold } from './course-change.notice-plan';

/** The write's messages for the family's one message, and the changes to announce after it. */
interface Prepared<T> {
  messages: T[];
  changes: ScheduleChange[];
}

/**
 * A course change (change_course) tells the teacher and the family (owner 2026-10-30), as a
 * lesson reschedule does: before the write FamilyMoveNotice chooses the family's ONE message
 * (lesson_rescheduled, then the write's booking confirmation is dropped; otherwise the
 * confirmation stays), after the commit ScheduleNotices hears each change (course-change.
 * notice-plan.ts) and a new teacher gets TeacherAlert's teacher_new_student and new_student bell
 * (their own rule and template gate). Every send is idempotent (the dedup keys); a replay never
 * gets here (CourseChange returns the first change).
 */
@Injectable()
export class CourseChangeNotices {
  constructor(
    private readonly move: FamilyMoveNotice,
    private readonly events: LessonEvents,
    private readonly alert: TeacherAlert,
  ) {}

  async prepare<T>(told: CourseTold, messages: readonly T[]): Promise<Prepared<T>> {
    const move = courseMove(told);
    if (!move) return { messages: [...messages], changes: courseChanges(told, false) };
    const span = { from: move.from.starts_at, to: move.to.starts_at };
    const chosen = await this.move.choose(span, messages);
    return { messages: chosen.messages, changes: courseChanges(told, chosen.familyNotice) };
  }

  /** After the commit. Never throws (LessonEvents and TeacherAlert log their failures). */
  async announce(told: CourseTold, changes: readonly ScheduleChange[]): Promise<void> {
    for (const change of changes) await this.events.scheduleChanged(change);
    const [first] = earliest(told.added);
    if (!told.teacherChanged || !first) return;
    const studentIds = told.studentIds;
    await this.alert.toTeachers({ lessonIds: [first.id], studentIds, kind: 'package' });
  }
}
