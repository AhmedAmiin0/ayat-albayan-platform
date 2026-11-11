import type { StudentAttendanceTable } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { TeacherMeRepo } from '@/modules/teaching/lessons';
import { attendanceWindow, monthIn, toAttendanceTable } from './student-attendance.mapper';
import { StudentAttendanceRepo } from './student-attendance.repo';

interface TeacherAttendanceInput {
  /** The signed-in teacher's profile id. */
  profileId: string;
  studentId: string;
  /** "YYYY-MM" in her zone; absent: the current month. */
  month?: string | undefined;
}

const isHers = (me: { students: readonly { id: string }[] }, studentId: string): boolean =>
  me.students.some((s) => s.id === studentId);

/**
 * The teacher's «سجل الحضور» of one of HER students (docs/46 C5): only her own lessons with that
 * student (all time, month by month in her zone), the teacher's reading (an auto-held lesson with
 * no report is «لم يُسجَّل»). Another teacher's lesson, or a student who is not hers, never shows:
 * a student outside TeacherMeRepo.students is 404 student_not_found (no existence leak).
 */
@Injectable()
export class TeacherAttendanceService {
  constructor(
    @Inject(TeacherMeRepo) private readonly me: TeacherMeRepo,
    @Inject(StudentAttendanceRepo) private readonly queries: StudentAttendanceRepo,
  ) {}

  async table(input: TeacherAttendanceInput, now = new Date()): Promise<StudentAttendanceTable> {
    const { studentId } = input;
    const me = await this.teacher(input.profileId, studentId);
    const month = input.month ?? monthIn(now, me.tz);
    const window = { ...attendanceWindow(month, now, me.tz), teacherId: me.id };
    const [lessons, starts] = await Promise.all([
      this.queries.lessons(studentId, window),
      this.queries.starts(studentId, now, me.id),
    ]);
    const reports = await this.queries.reports(studentId, lessons.map((l) => l.id));
    const table = { month, lessons, reports, starts, mine: true, tz: me.tz };
    return toAttendanceTable({ ...table, reader: 'teacher' }, now);
  }

  /** Her teachers row (404 teacher_not_linked) holding this student (404 student_not_found). */
  private async teacher(profileId: string, studentId: string) {
    const me = await this.me.me(profileId);
    if (!me) throw notFound('teacher_not_linked');
    if (!isHers(me, studentId)) throw notFound('student_not_found');
    return me;
  }
}
