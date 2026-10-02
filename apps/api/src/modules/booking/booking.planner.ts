import { normalizeArabic, type BookingRequest, type Conflict } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { findConflicts } from '../scheduling/conflicts';
import { domainError } from './booking.errors';
import { leadTarget, lessonRows, meetingLinkFor, type BookingPayload } from './booking.mapper';
import { confirmationDrafts, type BookedStudent } from './booking.messages';
import { planBooking } from './booking.plan';
import { BookingQueries, type BookingTeacher } from './booking.queries';
import { ConflictContext } from './conflict-context';

/** Who is booked: existing rows (conflict-checked) and, on the lead path, the student to create. */
type Resolved = Pick<BookingPayload, 'student_ids' | 'new_guardian' | 'new_student'> & {
  booked: BookedStudent[];
  overrides: (string | null | undefined)[];
};
export type Prepared = { payload: BookingPayload; conflicts: Conflict[] };

const notFound = (code: string) => domainError(HttpStatus.NOT_FOUND, code);

/**
 * Everything POST /booking decides before writing (docs/10 §5 #14, R-SCH-04, R-SCH-06, R-LEAD-06):
 * resolve students / lead, generate the horizon's occurrences, check every one for conflicts
 * (409 unless override.reason), pick the meeting link and draft one confirmation per guardian.
 * ponytail: check-then-write, so two admins booking the same slot at the same second can both
 * pass; add a per-teacher advisory lock + re-check in create_booking if that ever happens.
 */
@Injectable()
export class BookingPlanner {
  constructor(
    private readonly queries: BookingQueries,
    private readonly context: ConflictContext,
    private readonly settings: SettingsService,
  ) {}

  async prepare(req: BookingRequest): Promise<Prepared> {
    const { teacher, lead } = await this.lookup(req);
    const who = await this.resolve(req);
    const { plan, first, conflicts } = await this.check(req, teacher, who);
    const meetingLink = this.link(req, who, teacher);
    const payload: BookingPayload = {
      rule: { ...plan.timing, teacher_id: teacher.id, meeting_link: meetingLink, package: req.package },
      student_ids: who.student_ids,
      lead: lead && { id: lead.id, from: lead.status, to: leadTarget(lead.status, req.package) },
      new_guardian: who.new_guardian,
      new_student: who.new_student,
      lessons: lessonRows(plan.occurrences, conflicts, req.override?.reason ?? null),
      messages: confirmationDrafts({ students: who.booked, firstStart: first.starts_at, meetingLink }),
    };
    return { payload, conflicts };
  }

  private async lookup(req: BookingRequest) {
    const teacher = await this.queries.teacher(req.teacherId);
    if (!teacher) throw notFound('teacher_not_found');
    const lead = req.leadId ? await this.queries.lead(req.leadId) : null;
    if (req.leadId && !lead) throw notFound('lead_not_found');
    return { teacher, lead };
  }

  /** Occurrences over the horizon, each checked; 409 on any clash unless overridden (R-SCH-04). */
  private async check(req: BookingRequest, teacher: BookingTeacher, who: Resolved) {
    const horizonWeeks = await this.settings.bookingHorizonWeeks();
    const plan = planBooking({ rule: req, now: new Date(), horizonWeeks });
    const [first] = plan.occurrences;
    const last = plan.occurrences.at(-1);
    if (!first || !last) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
    const span = { from: first.starts_at, to: last.ends_at };
    const rows = await this.context.load({ teacherId: teacher.id, studentIds: who.student_ids, ...span });
    const conflicts = findConflicts({ proposed: plan.occurrences, ...rows });
    if (conflicts.length > 0 && !req.override) {
      throw domainError(HttpStatus.CONFLICT, 'conflict', { conflicts });
    }
    return { plan, first, conflicts };
  }

  private link(req: BookingRequest, who: Resolved, teacher: BookingTeacher): string | null {
    return meetingLinkFor({ requested: req.meetingLink, overrides: who.overrides, teacherLink: teacher.meeting_link });
  }

  private async resolve(req: BookingRequest): Promise<Resolved> {
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
