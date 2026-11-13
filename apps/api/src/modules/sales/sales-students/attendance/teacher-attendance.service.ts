import type { StudentAttendanceTable } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { ReportsSettings } from '@/modules/reporting/reports';
import { attendanceWindow, monthIn, toAttendanceTable } from './student-attendance.mapper';
import { StudentAttendanceRepo } from './student-attendance.repo';
import { TeacherStudentAccess } from './teacher-file/teacher-student-access';

interface TeacherAttendanceInput {
  /** The signed-in teacher's profile id. */
  profileId: string;
  studentId: string;
  /** "YYYY-MM" in her zone; absent: the current month. */
  month?: string | undefined;
}

/**
 * The teacher's «سجل الحضور» of a student she may open (docs/46 C5, docs/47 TeacherStudentAccess):
 * only her own lessons with that student (all time, month by month in her zone), the teacher's
 * reading (an auto-held lesson with no report is «لم يُسجَّل»), and per row her report's state
 * (write / edit inside her window / view). Another teacher's lesson never shows.
 */
@Injectable()
export class TeacherAttendanceService {
  constructor(
    @Inject(TeacherStudentAccess) private readonly access: TeacherStudentAccess,
    @Inject(StudentAttendanceRepo) private readonly repo: StudentAttendanceRepo,
    @Inject(ReportsSettings) private readonly settings: ReportsSettings,
  ) {}

  async table(input: TeacherAttendanceInput, now = new Date()): Promise<StudentAttendanceTable> {
    const { studentId } = input;
    const me = await this.access.owner(input.profileId, studentId, now);
    const month = input.month ?? monthIn(now, me.tz);
    const window = { ...attendanceWindow(month, now, me.tz), teacherId: me.id };
    const [lessons, starts, settings] = await Promise.all([
      this.repo.lessons(studentId, window),
      this.repo.starts(studentId, now, me.id),
      this.settings.read(),
    ]);
    const reports = await this.repo.reports(studentId, lessons.map((l) => l.id));
    const table = { month, lessons, reports, starts, mine: true, tz: me.tz };
    const minutes = settings.report_teacher_edit_minutes;
    return toAttendanceTable({ ...table, reader: 'teacher', minutes }, now);
  }
}
