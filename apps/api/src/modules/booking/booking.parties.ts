import { normalizeArabic, type BookingRequest } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { detectDuplicates } from '../students/duplicate-detector';
import { domainError } from './booking.errors';
import type { BookingPayload } from './booking.mapper';
import type { BookedStudent } from './booking.messages';
import { BookingQueries } from './booking.queries';

/** Who is booked: existing rows (conflict-checked) and, on the lead path, the student to create. */
export type Resolved = Pick<BookingPayload, 'student_ids' | 'new_guardian' | 'new_student'> & {
  booked: BookedStudent[];
  overrides: (string | null | undefined)[];
};

const notFound = (code: string) => domainError(HttpStatus.NOT_FOUND, code);

/** Teacher, lead and students of a POST /booking (docs/10 §5 #14, R-LEAD-06, R-STU-03). */
@Injectable()
export class BookingParties {
  constructor(private readonly queries: BookingQueries) {}

  /** 404 teacher_not_found / lead_not_found. */
  async lookup(req: BookingRequest) {
    const teacher = await this.queries.teacher(req.teacherId);
    if (!teacher) throw notFound('teacher_not_found');
    const lead = req.leadId ? await this.queries.lead(req.leadId) : null;
    if (req.leadId && !lead) throw notFound('lead_not_found');
    return { teacher, lead };
  }

  /**
   * Existing students (404 student_not_found), or the lead path's new student. A guardian already
   * on file with a similar-named child → 409 duplicate_student + candidates unless `force`
   * (R-STU-03, issue A1); the wizard then books the existing student instead.
   */
  async resolve(req: BookingRequest): Promise<Resolved> {
    if ('studentIds' in req) {
      const rows = await this.queries.students(req.studentIds);
      if (rows.length !== req.studentIds.length) throw notFound('student_not_found');
      return {
        student_ids: rows.map((s) => s.id),
        new_guardian: null,
        new_student: null,
        booked: rows.map((s) => ({ name: s.name, guardian: s.guardian })),
        overrides: rows.map((s) => s.meeting_link_override),
      };
    }
    const { guardian, newStudent } = req;
    const existing = await this.queries.guardianByPhone(guardian.phone_e164);
    if (existing && !req.force) {
      const candidates = detectDuplicates(newStudent.name, existing.students);
      if (candidates.length > 0) {
        throw domainError(HttpStatus.CONFLICT, 'duplicate_student', { guardian_id: existing.id, candidates });
      }
    }
    const target = { id: existing?.id ?? null, phone_e164: guardian.phone_e164, tz: existing?.tz ?? guardian.tz };
    return {
      student_ids: [],
      new_guardian: guardian,
      new_student: { ...newStudent, name_normalized: normalizeArabic(newStudent.name) },
      booked: [{ name: newStudent.name, guardian: target }],
      overrides: [newStudent.meeting_link_override],
    };
  }
}
