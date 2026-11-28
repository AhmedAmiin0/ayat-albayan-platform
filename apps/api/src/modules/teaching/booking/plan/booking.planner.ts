import type { BookingRequest } from '@ab/shared';
import {
  bookingKindOf,
  isSingleLesson,
  meetingModeOf,
  usesPlatform,
  type Conflict,
  probeOccurrences,
} from '@ab/schedule';
import { uploadMaxBytes } from '@ab/settings';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import { meetingLinkFor } from '@/modules/teaching/booking/core/booking.mapper';
import { bookingPayload } from '@/modules/teaching/booking/core/booking.payload';
import { BookingParties } from '@/modules/teaching/booking/core/booking.parties';
import type { Plan } from './booking.plan';
import type { Occurrence } from '@ab/schedule';
import type { PrepareOptions, Prepared, Series, SeriesContext } from './booking.planner.types';
import { planSeries } from './booking.series-plan';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { assertNotPast, bookableConflicts } from './outside-hours';
import { httpError } from '@/common/http/errors';


/** Before the plan: a missing invoice is not a clash the admin can override away. */
function assertInvoice(req: BookingRequest, invoiceWaived: boolean): void {
  const needsInvoice = bookingKindOf(req) !== 'trial' && !invoiceWaived;
  if (needsInvoice && !req.invoice) throw httpError(HttpStatus.BAD_REQUEST, 'invoice_required');
}

/**
 * Everything POST /booking decides before writing (docs/10 §5 #14, R-SCH-04, R-SCH-06, R-LEAD-06,
 * R-SCH-10): resolve students / lead, the missed lesson of a makeup, generate the horizon's
 * occurrences (one for a trial or a makeup), check every one for conflicts (409 unless
 * override.reason), pick the meeting link and draft one confirmation per guardian (with no link
 * when the teacher holds lessons in our classroom: usesPlatform(meeting_mode,
 * settings.meeting_link_auto)). `conflicts` runs the same check for the wizard before its last step
 * (nothing written). The invoice is not here: it is a file, resolved by BookingInvoices after this
 * plan holds. ponytail: check-then-write, so two admins booking the same slot at the same second
 * can both pass; add a per-teacher advisory lock + re-check in create_booking if that ever happens.
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
    const ctx = { teacher, who, endsOn: opts.endsOn, exclude: opts.excludeLessonIds };
    return (await this.series(req, ctx)).conflicts;
  }

  async prepare(req: BookingRequest, opts: PrepareOptions = {}): Promise<Prepared> {
    const kind = bookingKindOf(req);
    const invoiceWaived = opts.invoiceWaived === true;
    assertInvoice(req, invoiceWaived);
    const { teacher, lead } = await this.parties.lookup(req);
    const who = await this.parties.resolve(req, lead);
    const makeupOf = kind === 'makeup' ? await this.parties.missed(req) : null;
    const ctx = { teacher, who, endsOn: opts.endsOn, exclude: opts.excludeLessonIds };
    const { plan, siblings, first, conflicts } = await this.series(req, ctx);
    if (conflicts.length > 0 && !req.override) {
      throw httpError(HttpStatus.CONFLICT, 'conflict', { conflicts });
    }
    const settings = await this.settings.read();
    const meetingLink = meetingLinkFor({
      requested: req.meetingLink,
      overrides: who.overrides,
      teacherLink: teacher.meeting_link,
    });
    // The lessons keep the link either way; a platform teacher's confirmation names none (no lesson
    // id yet, so no classroom token).
    const platform = usesPlatform(meetingModeOf(teacher.meeting_mode), settings.meeting_link_auto);
    const confirmationLink = platform ? null : meetingLink;
    const parts = { req, kind, teacher, who, lead, plan, siblings, first, conflicts };
    const links = { meetingLink, confirmationLink, makeupOf, course: opts.course };
    const payload = bookingPayload({ ...parts, ...links });
    const leadPhone = lead?.phone_e164 ? [lead.phone_e164] : [];
    const phones = [...who.booked.map((s) => s.guardian.phone_e164), ...leadPhone];
    const invoiceMaxBytes = uploadMaxBytes(settings);
    return { payload, conflicts, phones: [...new Set(phones)], invoiceMaxBytes, invoiceWaived };
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
    const rule = { ...req, single };
    const plans = planSeries({ rule, now: new Date(), horizonWeeks, endsOn: ctx.endsOn });
    const [plan, ...siblings] = plans;
    const first = plan?.occurrences[0];
    if (!plan || !first) throw httpError(HttpStatus.BAD_REQUEST, 'no_occurrences');
    assertNotPast(req, new Date());
    const tzs = [req.tz, ctx.teacher.tz];
    const probe = single ? [] : plans.flatMap((p) => probeAfter(p, tzs));
    const found = await this.checker.check({
      teacherId: ctx.teacher.id,
      studentIds: ctx.who.student_ids,
      proposed: [...plans.flatMap((p) => p.occurrences), ...probe],
      excludeIds: [...(ctx.exclude ?? [])],
    });
    return { plan, siblings, first, conflicts: bookableConflicts(found, req) };
  }
}

/** The plan's rule a week around each DST change after its last generated lesson. */
function probeAfter(plan: Plan, tzs: readonly string[]): Occurrence[] {
  const last = plan.occurrences.at(-1);
  return last ? probeOccurrences({ timing: plan.timing, tzs, after: last.starts_at }) : [];
}
