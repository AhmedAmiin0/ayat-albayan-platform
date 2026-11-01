import { bookingKindOf, isSingleLesson, meetingModeOf, uploadMaxBytes, usesPlatform, type BookingRequest, type Conflict } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import { probeOccurrences } from '@/modules/teaching/scheduling/occurrences/dst-probe';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { meetingLinkFor, type BookingPayload } from '@/modules/teaching/booking/core/booking.mapper';
import { bookingPayload, type CourseLabel } from '@/modules/teaching/booking/core/booking.payload';
import { BookingParties, type Resolved } from '@/modules/teaching/booking/core/booking.parties';
import type { Plan } from './booking.plan';
import type { BookingTeacher } from '@/modules/teaching/booking/core/booking.repo';
import type { Occurrence } from '@/modules/teaching/scheduling/occurrences/occurrences';
import { planSeries } from './booking.series-plan';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';

export type Prepared = {
  payload: BookingPayload;
  conflicts: Conflict[];
  /** E.164 of every booked guardian: the only chats an invoice may be saved from (R-MSG-06). */
  phones: string[];
  /** settings.upload_max_mb in bytes: the invoice file must not be larger. */
  invoiceMaxBytes: number;
  /** The booking may go without an invoice (PrepareOptions.invoiceWaived). */
  invoiceWaived: boolean;
};

/**
 * Server-side choices of the caller, never of the request body: the assistant's course of a
 * subscription she sold (SalesBookingService) has no invoice (the transfer is recorded later on the
 * subscription, owner 2026-10-18 decision 2) and ends on its N-th lesson (decision 1). The admin
 * passes none: invoice_required and open-ended rules, as before.
 */
export type PrepareOptions = {
  invoiceWaived?: boolean;
  /** Every rule's ends_on (plannedCourseEnd): the whole course is planned and checked, nothing after it. */
  endsOn?: string | null;
  /** The subscription it books: every rule's package and subscription_id (CourseLabel). */
  course?: CourseLabel;
  /** Lessons the check ignores: the upcoming trial a «موعد تجريبي جديد» moves (TrialDates). */
  excludeLessonIds?: readonly string[];
};
type Series = { plan: Plan; siblings: Plan[]; first: Occurrence; conflicts: Conflict[] };

/** Before the plan: a missing invoice is not a clash the admin can override away. */
function assertInvoice(req: BookingRequest, invoiceWaived: boolean): void {
  if (bookingKindOf(req) !== 'trial' && !req.invoice && !invoiceWaived) throw domainError(HttpStatus.BAD_REQUEST, 'invoice_required');
}

/**
 * Everything POST /booking decides before writing (docs/10 §5 #14, R-SCH-04, R-SCH-06, R-LEAD-06,
 * R-SCH-10): resolve students / lead, the missed lesson of a makeup, generate the horizon's
 * occurrences (one for a trial or a makeup), check every one for conflicts (409 unless
 * override.reason), pick the meeting link and draft one confirmation per guardian (with no link
 * when the teacher holds lessons in our classroom: usesPlatform(meeting_mode, settings.meeting_link_auto)).
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
    private readonly settings: BookingSettings,
  ) {}

  /** POST /booking/check: the series' clashes, nothing written, never a 409 conflict. */
  async conflicts(req: BookingRequest, opts: PrepareOptions = {}): Promise<Conflict[]> {
    const { teacher, lead } = await this.parties.lookup(req);
    const who = await this.parties.resolve(req, lead);
    return (await this.series(req, { teacher, who, endsOn: opts.endsOn, exclude: opts.excludeLessonIds })).conflicts;
  }

  async prepare(req: BookingRequest, opts: PrepareOptions = {}): Promise<Prepared> {
    const kind = bookingKindOf(req);
    const invoiceWaived = opts.invoiceWaived === true;
    assertInvoice(req, invoiceWaived);
    const { teacher, lead } = await this.parties.lookup(req);
    const who = await this.parties.resolve(req, lead);
    const makeupOf = kind === 'makeup' ? await this.parties.missed(req) : null;
    const { plan, siblings, first, conflicts } = await this.series(req, { teacher, who, endsOn: opts.endsOn, exclude: opts.excludeLessonIds });
    if (conflicts.length > 0 && !req.override) {
      throw domainError(HttpStatus.CONFLICT, 'conflict', { conflicts });
    }
    const settings = await this.settings.read();
    const meetingLink = meetingLinkFor({
      requested: req.meetingLink,
      overrides: who.overrides,
      teacherLink: teacher.meeting_link,
    });
    // The lessons keep the link either way; a platform teacher's confirmation names none (no lesson id yet, so no classroom token).
    const platform = usesPlatform(meetingModeOf(teacher.meeting_mode), settings.meeting_link_auto);
    const confirmationLink = platform ? null : meetingLink;
    const payload = bookingPayload({ req, kind, teacher, who, lead, plan, siblings, first, conflicts, meetingLink, confirmationLink, makeupOf, course: opts.course });
    const phones = [...who.booked.map((s) => s.guardian.phone_e164), ...(lead?.phone_e164 ? [lead.phone_e164] : [])];
    return { payload, conflicts, phones: [...new Set(phones)], invoiceMaxBytes: uploadMaxBytes(settings), invoiceWaived };
  }

  /**
   * Occurrences over the horizon of every start time (planSeries) plus a week after each coming DST
   * change of each time's rule (probeOccurrences), all checked at once against lessons and the
   * occurrences other rules will still generate (R-SCH-04, issue B3). Probed occurrences are
   * reported, never written. A trial or a makeup is one lesson, so it has no series to probe.
   */
  private async series(req: BookingRequest, ctx: SeriesContext): Promise<Series> {
    const horizonWeeks = (await this.settings.read()).booking_horizon_weeks;
    const single = isSingleLesson(bookingKindOf(req));
    const plans = planSeries({ rule: { ...req, single }, now: new Date(), horizonWeeks, endsOn: ctx.endsOn });
    const [plan, ...siblings] = plans;
    const first = plan?.occurrences[0];
    if (!plan || !first) throw domainError(HttpStatus.BAD_REQUEST, 'no_occurrences');
    const tzs = [req.tz, ctx.teacher.tz];
    const probe = single ? [] : plans.flatMap((p) => probeAfter(p, tzs));
    const conflicts = await this.checker.check({
      teacherId: ctx.teacher.id,
      studentIds: ctx.who.student_ids,
      proposed: [...plans.flatMap((p) => p.occurrences), ...probe],
      excludeIds: [...(ctx.exclude ?? [])],
    });
    return { plan, siblings, first, conflicts };
  }
}

type SeriesContext = { teacher: BookingTeacher; who: Resolved; endsOn?: string | null | undefined; exclude?: readonly string[] | undefined };

/** The plan's rule a week around each DST change after its last generated lesson. */
function probeAfter(plan: Plan, tzs: readonly string[]): Occurrence[] {
  const last = plan.occurrences.at(-1);
  return last ? probeOccurrences({ timing: plan.timing, tzs, after: last.starts_at }) : [];
}
