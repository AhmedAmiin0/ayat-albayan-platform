import type { TeacherMe } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { TeacherMeRepo } from '@/modules/teaching/lessons';
import { StudentAttendanceRepo } from '@/modules/sales/sales-students/attendance/student-attendance.repo';

/** How far back one of her lessons keeps a student hers (docs/47 guard). */
const TAUGHT_DAYS = 90;
const DAY_MS = 86_400_000;

/** Her teachers row: its id and her zone. */
interface TeacherOwner {
  id: string;
  tz: string;
}

/** Assigned to her or on one of her active rules (TeacherMeRepo.students). */
const isHers = (me: Pick<TeacherMe, 'students'>, studentId: string): boolean =>
  me.students.some((s) => s.id === studentId);

/**
 * The teacher's student file guard (docs/47): the student is hers (isHers), or she taught or will
 * teach a lesson with the student (scheduled, confirmed, completed, late, no_show) in the last 90
 * days. A lesson moved away from her or cancelled never counts (gap 15). Otherwise 404
 * student_not_found, with no existence leak.
 */
@Injectable()
export class TeacherStudentAccess {
  constructor(
    @Inject(TeacherMeRepo) private readonly me: TeacherMeRepo,
    @Inject(StudentAttendanceRepo) private readonly repo: StudentAttendanceRepo,
  ) {}

  async owner(profileId: string, studentId: string, now: Date): Promise<TeacherOwner> {
    const me = await this.teacher(profileId);
    const since = new Date(now.getTime() - TAUGHT_DAYS * DAY_MS);
    const allowed =
      isHers(me, studentId) || (await this.repo.taughtBy({ teacherId: me.id, studentId, since }));
    if (!allowed) throw notFound('student_not_found');
    return { id: me.id, tz: me.tz };
  }

  /** Her teachers row; 404 teacher_not_linked without one. */
  private async teacher(profileId: string): Promise<TeacherMe> {
    const me = await this.me.me(profileId);
    if (!me) throw notFound('teacher_not_linked');
    return me;
  }
}
