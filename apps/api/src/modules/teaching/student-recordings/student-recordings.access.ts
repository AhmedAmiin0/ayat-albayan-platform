import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import type { ManageRule } from './student-recordings.mapper';
import { StudentRecordingQueries } from './student-recordings.queries';

/** Which of a student's lessons a login may see recordings of: `onlyTeacherId` null = all of them. */
interface RecordingScope {
  onlyTeacherId: string | null;
  /** Which rows the login may show/hide from the student. */
  manage: ManageRule;
}

/**
 * Who may open a student's recordings (rule 9, the API being the gate): any admin; a teacher for
 * the lessons THEY taught, and for every lesson of a student currently assigned to them; an
 * assistant only for students assigned to them (student_assistants). Nobody else: another
 * teacher's student, an unassigned assistant, sales and guardians (the portal will add its own route and RLS policy).
 */
@Injectable()
export class StudentRecordingAccess {
  constructor(
    private readonly queries: StudentRecordingQueries,
    private readonly teachers: TeachersRepo,
  ) {}

  /** 404 student_not_found, 403 when the login has no business with this student. */
  async scopeFor(user: AuthUser, studentId: string): Promise<RecordingScope> {
    const student = await this.queries.student(studentId);
    if (!student) throw notFound('student_not_found');
    if (user.role === 'admin') return { onlyTeacherId: null, manage: 'all' };
    if (user.role === 'assistant' && (await this.queries.assists({ profileId: user.id, studentId }))) return { onlyTeacherId: null, manage: 'none' };
    if (user.role === 'teacher') return this.teacherScope(user, student);
    throw new ForbiddenException();
  }

  private async teacherScope(user: AuthUser, student: { id: string; teacher_id: string | null }): Promise<RecordingScope> {
    const teacherId = await this.teachers.idByProfile(user.id);
    if (!teacherId) throw new ForbiddenException();
    const manage = { teacherId };
    if (student.teacher_id === teacherId) return { onlyTeacherId: null, manage };
    if (await this.queries.taughtBy({ teacherId, studentId: student.id })) return { onlyTeacherId: teacherId, manage };
    throw new ForbiddenException();
  }
}
