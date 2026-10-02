import type { BookingRequest, Conflict } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { ConflictChecker } from '../scheduling/conflict-checker';
import { probeOccurrences } from '../scheduling/dst-probe';
import { domainError } from './booking.errors';
import { leadTarget, lessonRows, meetingLinkFor, type BookingPayload } from './booking.mapper';
import { confirmationDrafts } from './booking.messages';
import { BookingParties, type Resolved } from './booking.parties';
import { planBooking } from './booking.plan';
import type { BookingTeacher } from './booking.queries';

export type Prepared = { payload: BookingPayload; conflicts: Conflict[] };

/**
 * Everything POST /booking decides before writing (docs/10 §5 #14, R-SCH-04, R-SCH-06, R-LEAD-06):
 * resolve students / lead, generate the horizon's occurrences, check every one for conflicts
 * (409 unless override.reason), pick the meeting link and draft one confirmation per guardian.
 * `conflicts` runs the same check for the wizard before its last step (nothing written).
 * ponytail: check-then-write, so two admins booking the same slot at the same second can both
 * pass; add a per-teacher advisory lock + re-check in create_booking if that ever happens.
 */
@Injectable()
export class BookingPlanner {
  constructor(
    private readonly parties: BookingParties,
    private readonly checker: ConflictChecker,
    private readonly settings: SettingsService,
  ) {}

  /** POST /booking/check: the series' clashes, nothing written, never a 409 conflict. */
  async conflicts(req: BookingRequest): Promise<Conflict[]> {
    const { teacher } = await this.parties.lookup(req);
    const who = await this.parties.resolve(req);
    return (await this.series(req, teacher, who)).conflicts;
  }

  async prepare(req: BookingRequest): Promise<Prepared> {
    const { teacher, lead } = await this.parties.lookup(req);
    const who = await this.parties.resolve(req);
    const { plan, first, conflicts } = await this.series(req, teacher, who);
    if (conflicts.length > 0 && !req.override) {
      throw domainError(HttpStatus.CONFLICT, 'conflict', { conflicts });
    }
    const meetingLink = meetingLinkFor({
      requested: req.meetingLink,
      overrides: who.overrides,
      teacherLink: teacher.meeting_link,
    });
    const reason = req.override?.reason ?? null;
    const payload: BookingPayload = {
      // The rule keeps only an explicit link, so a later change of the teacher's link reaches
      // the lessons the daily job generates (R-LES-01, issue B8).
      rule: {
        ...plan.timing,
        teacher_id: teacher.id,
        meeting_link: req.meetingLink ?? null,
        package: req.package,
        client_request_id: req.clientRequestId ?? null,
      },
      student_ids: who.student_ids,
      lead: lead && { id: lead.id, from: lead.status, to: leadTarget(lead.status, req.package) },
      new_guardian: who.new_guardian,
      new_student: who.new_student,
      lessons: lessonRows({ occurrences: plan.occurrences, conflicts, reason, meetingLink }),
      messages: confirmationDrafts({ students: who.booked, firstStart: first.starts_at, meetingLink }),
      audit: {
        after: {
          package: req.package,
          lead_id: req.leadId ?? null,
          override_reason: reason,
          conflicts: conflicts.map((c) => ({ ...c })),
        },
      },
    };
    return { payload, conflicts };
  }

  /**
   * Occurrences over the horizon plus a week after each coming DST change (probeOccurrences), all
   * checked against lessons and the occurrences other rules will still generate (R-SCH-04,
   * issue B3). Probed occurrences are reported, never written.
   */
  private async series(req: BookingRequest, teacher: BookingTeacher, who: Resolved) {
    const horizonWeeks = await this.settings.bookingHorizonWeeks();
    const plan = planBooking({ rule: req, now: new Date(), horizonWeeks });
    const [first] = plan.occurrences;
    const last = plan.occurrences.at(-1);
    if (!first || !last) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
    const probe =
      req.package === 'trial'
        ? []
        : probeOccurrences({ timing: plan.timing, tzs: [req.tz, teacher.tz], after: last.starts_at });
    const conflicts = await this.checker.check({
      teacherId: teacher.id,
      studentIds: who.student_ids,
      proposed: [...plan.occurrences, ...probe],
      excludeIds: [],
    });
    return { plan, first, conflicts };
  }
}
