import type { BookingTeacherOption } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { domainError } from './booking.errors';
import { BookingQueries } from './booking.queries';
import type { TeacherOptionsQuery } from './booking.dto';
import { TeacherOptionsQueries, type TeacherFilter } from './teacher-options.queries';

/**
 * GET /booking/teachers (R-SCH-06): active teachers of the program, filtered by gender — the
 * query's, else the student's teacher_gender_pref, else any — with their current load.
 */
@Injectable()
export class TeacherOptionsService {
  constructor(
    private readonly options: TeacherOptionsQueries,
    private readonly queries: BookingQueries,
  ) {}

  async list(q: TeacherOptionsQuery): Promise<BookingTeacherOption[]> {
    const teachers = await this.options.active(await this.filter(q));
    if (teachers.length === 0) return [];
    const ids = teachers.map((t) => t.id);
    const [loads, available] = await Promise.all([
      this.options.loads(ids),
      this.options.withAvailability(ids),
    ]);
    return teachers.map((t) => ({
      ...t,
      students_count: loads.get(t.id) ?? 0,
      has_availability: available.has(t.id),
    }));
  }

  private async filter(q: TeacherOptionsQuery): Promise<TeacherFilter> {
    if (!q.studentId) {
      // The DTO already requires one of the two; never fall back to a program silently.
      if (!q.program) throw domainError(HttpStatus.BAD_REQUEST, 'student_or_program');
      return { program: q.program, gender: q.gender };
    }
    const [student] = await this.queries.students([q.studentId]);
    if (!student) throw domainError(HttpStatus.NOT_FOUND, 'student_not_found');
    return { program: student.program, gender: q.gender ?? student.teacher_gender_pref ?? undefined };
  }
}
