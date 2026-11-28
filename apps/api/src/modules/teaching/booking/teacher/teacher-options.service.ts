import {
  bookingTeacherOptionSchema,
  meetingModeOf,
  usesPlatform,
  type BookingTeacherOption,
} from '@ab/schedule';
import { HttpStatus, Injectable } from '@nestjs/common';
import { BookingRepo } from '@/modules/teaching/booking/core/booking.repo';
import type { TeacherOptionsQuery } from '@ab/schedule';
import { TeacherOptionsRepo, type TeacherFilter } from './teacher-options.repo';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { httpError } from '@/common/http/errors';
import { asResponse } from '@/common/http/returns';

/**
 * GET /booking/teachers (R-SCH-06): active teachers of the program, filtered by gender — the
 * query's, else the student's teacher_gender_pref, else any — with their current load and whether
 * their lessons go out with our classroom (platform_classroom, migration 490).
 */
@Injectable()
export class TeacherOptionsService {
  constructor(
    private readonly options: TeacherOptionsRepo,
    private readonly queries: BookingRepo,
    private readonly teachers: TeachersRepo,
  ) {}

  async list(q: TeacherOptionsQuery): Promise<BookingTeacherOption[]> {
    const teachers = await this.options.active(await this.filter(q));
    if (teachers.length === 0) return [];
    const ids = teachers.map((t) => t.id);
    const [loads, available, auto] = await Promise.all([
      this.teachers.loads(ids),
      this.options.withAvailability(ids),
      this.options.academyAuto(),
    ]);
    const options = teachers.map(({ meeting_mode, ...t }) => ({
      ...t,
      platform_classroom: usesPlatform(meetingModeOf(meeting_mode), auto),
      students_count: loads.get(t.id) ?? 0,
      has_availability: available.has(t.id),
    }));
    return asResponse(bookingTeacherOptionSchema.array(), options);
  }

  private async filter(q: TeacherOptionsQuery): Promise<TeacherFilter> {
    if (!q.studentId) {
      // The DTO already requires one of the two; never fall back to a program silently.
      if (!q.program) throw httpError(HttpStatus.BAD_REQUEST, 'student_or_program');
      return { program: q.program, gender: q.gender };
    }
    const [student] = await this.queries.students([q.studentId]);
    if (!student) throw httpError(HttpStatus.NOT_FOUND, 'student_not_found');
    return {
      program: student.program,
      gender: q.gender ?? student.teacher_gender_pref ?? undefined,
    };
  }
}
