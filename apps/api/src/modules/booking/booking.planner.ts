import { bookingKindOf, isSingleLesson, uploadMaxBytes, type BookingRequest, type Conflict } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { ConflictChecker } from '../scheduling/conflict-checker';
import { probeOccurrences } from '../scheduling/dst-probe';
import { domainError } from './booking.errors';
import { meetingLinkFor, type BookingPayload } from './booking.mapper';
import { bookingPayload } from './booking.payload';
import { BookingParties, type Resolved } from './booking.parties';
import { planBooking } from './booking.plan';
import type { BookingTeacher } from './booking.queries';

export type Prepared = {
  payload: BookingPayload;
  conflicts: Conflict[];
  /** E.164 of every booked guardian: the only chats an invoice may be saved from (R-MSG-06). */
  phones: string[];
  /** settings.upload_max_mb in bytes: the invoice file must not be larger. */
  invoiceMaxBytes: number;
};

/**
 * Everything POST /booking decides before writing (docs/10 §5 #14, R-SCH-04, R-SCH-06, R-LEAD-06,
 * R-SCH-10): resolve students / lead, the missed lesson of a makeup, generate the horizon's
 * occurrences (one for a trial or a makeup), check every one for conflicts (409 unless
 * override.reason), pick the meeting link and draft one confirmation per guardian (with no link
 * while settings.meeting_link_auto is ON).
 * `conflicts` runs the same check for the wizard before its last step (nothing written).
 * The invoice is not here: it is a file, resolved by BookingInvoices after this plan holds.
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
    const { teacher, lead } = await this.parties.lookup(req);
    const who = await this.parties.resolve(req, lead);
    return (await this.series(req, teacher, who)).conflicts;
  }

  async prepare(req: BookingRequest): Promise<Prepared> {
    const kind = bookingKindOf(req);
    // Before the plan: a missing invoice is not a clash the admin can override away.
    if (kind !== 'trial' && !req.invoice) throw domainError(HttpStatus.BAD_REQUEST, 'invoice_required');
    const { teacher, lead } = await this.parties.lookup(req);
    const who = await this.parties.resolve(req, lead);
    const makeupOf = kind === 'makeup' ? await this.parties.missed(req) : null;
    const { plan, first, conflicts } = await this.series(req, teacher, who);
    if (conflicts.length > 0 && !req.override) {
      throw domainError(HttpStatus.CONFLICT, 'conflict', { conflicts });
    }
    const settings = await this.settings.all();
    const meetingLink = meetingLinkFor({
      requested: req.meetingLink,
      overrides: who.overrides,
      teacherLink: teacher.meeting_link,
    });
    // The lessons keep the link either way; in auto mode the confirmation names none (no lesson id yet, so no classroom token).
    const confirmationLink = settings.meeting_link_auto ? null : meetingLink;
    const payload = bookingPayload({ req, kind, teacher, who, lead, plan, first, conflicts, meetingLink, confirmationLink, makeupOf });
    const phones = [...who.booked.map((s) => s.guardian.phone_e164), ...(lead?.phone_e164 ? [lead.phone_e164] : [])];
    return { payload, conflicts, phones: [...new Set(phones)], invoiceMaxBytes: uploadMaxBytes(settings) };
  }

  /**
   * Occurrences over the horizon plus a week after each coming DST change (probeOccurrences), all
   * checked against lessons and the occurrences other rules will still generate (R-SCH-04,
   * issue B3). Probed occurrences are reported, never written. A trial or a makeup is one lesson,
   * so it has no series to probe.
   */
  private async series(req: BookingRequest, teacher: BookingTeacher, who: Resolved) {
    const horizonWeeks = await this.settings.bookingHorizonWeeks();
    const single = isSingleLesson(bookingKindOf(req));
    const plan = planBooking({ rule: { ...req, single }, now: new Date(), horizonWeeks });
    const [first] = plan.occurrences;
    const last = plan.occurrences.at(-1);
    if (!first || !last) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
    const probe = single
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
