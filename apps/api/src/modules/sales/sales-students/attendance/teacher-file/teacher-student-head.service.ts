import type { TeacherStudentHead } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { SalesRosterRepo } from '@/modules/sales/sales';
import { upcomingRows } from '@/modules/sales/sales-students/attendance/student-attendance.mapper';
import { StudentAttendanceRepo } from '@/modules/sales/sales-students/attendance/student-attendance.repo';
import { courseOf } from './teacher-course';
import { TeacherStudentAccess } from './teacher-student-access';

/** The board's window (docs/46 C7): her lessons with the student in the next 14 days. */
const UPCOMING_MS = 14 * 86_400_000;

interface HeadInput {
  /** The signed-in teacher's profile id. */
  profileId: string;
  studentId: string;
}

/**
 * GET /teachers/me/students/:id (docs/47): the student file's head for a student she may open
 * (TeacherStudentAccess): name, code, status, the course she is teaching (dates and lesson counts
 * only, never money) and her next 14 days with the student, cancelled and moved ones included.
 * SalesRosterRepo is read for balances only (its pinned selects stay as they are).
 */
@Injectable()
export class TeacherStudentHeadService {
  constructor(
    @Inject(TeacherStudentAccess) private readonly access: TeacherStudentAccess,
    @Inject(StudentAttendanceRepo) private readonly repo: StudentAttendanceRepo,
    @Inject(SalesRosterRepo) private readonly roster: SalesRosterRepo,
  ) {}

  async head(input: HeadInput, now = new Date()): Promise<TeacherStudentHead> {
    const { studentId } = input;
    const me = await this.access.owner(input.profileId, studentId, now);
    const window = { from: now, to: new Date(now.getTime() + UPCOMING_MS), teacherId: me.id };
    const [student, packages, lessons] = await Promise.all([
      this.repo.student(studentId),
      this.repo.packages(studentId),
      this.repo.lessons(studentId, window),
    ]);
    if (!student) throw notFound('student_not_found');
    const balances = await this.roster.balances(packages.map((p) => p.id));
    return {
      id: student.id,
      code: student.code ?? '',
      name: student.name,
      status: student.status,
      course: courseOf(packages, balances),
      upcoming: upcomingRows(lessons),
    };
  }
}
