import { normalizeArabic, type BookingRequest } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { detectDuplicates } from '@/modules/people/students/duplicate-detector';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import type { BookingPayload } from './booking.mapper';
import type { BookedStudent } from './booking.messages';
import { withLeadFacts, type LeadFacts } from './booking.lead-merge';
import { missedLesson } from '@/modules/teaching/booking/makeup/booking.makeup';
import { BookingRepo } from './booking.repo';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';

/** Who is booked: existing rows (conflict-checked) and, on the lead path, the student to create. */
export type Resolved = Pick<BookingPayload, 'student_ids' | 'new_guardian' | 'new_student'> & {
  booked: BookedStudent[];
  overrides: (string | null | undefined)[];
};

const notFound = (code: string) => domainError(HttpStatus.NOT_FOUND, code);

/** Teacher, lead and students of a POST /booking (docs/10 §5 #14, R-LEAD-06, R-STU-03). */
@Injectable()
export class BookingParties {
  constructor(
    private readonly queries: BookingRepo,
    private readonly settings: BookingSettings,
  ) {}

  /** 404 teacher_not_found / lead_not_found. */
  async lookup(req: BookingRequest) {
    const teacher = await this.queries.teacher(req.teacherId);
    if (!teacher) throw notFound('teacher_not_found');
    const lead = req.leadId ? await this.queries.lead(req.leadId) : null;
    if (req.leadId && !lead) throw notFound('lead_not_found');
    return { teacher, lead };
  }

  /**
   * The missed lesson of a makeup (R-SCH-10; booking.makeup.ts): 404 lesson_not_found, 400
   * makeup_student, 409 makeup_not_eligible. The schema guarantees one student and a lesson id.
   */
  async missed(req: BookingRequest): Promise<string> {
    const lessonId = req.makeupOfLessonId;
    const studentId = 'studentIds' in req ? req.studentIds[0] : undefined;
    if (!lessonId || !studentId) throw domainError(HttpStatus.BAD_REQUEST, 'makeup_student');
    const { makeup_window_days: windowDays } = await this.settings.read();
    return missedLesson(this.queries, { lessonId, studentId, now: new Date(), windowDays });
  }

  /**
   * Existing students (404 student_not_found), or the lead path's new student. A guardian already
   * on file with a similar-named child → 409 duplicate_student + candidates unless `force`
   * (R-STU-03, issue A1); the wizard then books the existing student instead. The lead's
   * qualification fills what the client left empty (withLeadFacts).
   */
  async resolve(req: BookingRequest, lead: LeadFacts | null = null): Promise<Resolved> {
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
    const { guardian, newStudent } = withLeadFacts(req, lead);
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
