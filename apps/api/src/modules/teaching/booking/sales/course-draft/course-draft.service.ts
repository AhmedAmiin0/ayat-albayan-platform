import type { BookingRequest, CourseDraftSaved } from '@ab/shared';
import { HttpException, HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { CourseDraftEnv } from './course-draft.env';
import { CourseDraftRepo } from './course-draft.repo';
import { confirmRequest, type CourseDraft } from './course-draft.rules';

/** A confirm: nothing to book, still unpaid, booked (now or before), or a clash kept the draft. */
type ConfirmOutcome = 'none' | 'held' | 'booked' | 'clash';


/**
 * «اختر أيام الحلقات» before the payment (owner 2026-11-06). While the package is unpaid with an
 * open payment link (hold mode) the wizard's picks are a DRAFT: saved (and saved again to edit) on
 * the package, nothing written to schedule_rules / lessons, nobody told; teachers' slots are not
 * held (a clash is checked again at payment). Once a payment is recorded (PackageEvents: the
 * webhook after markPaid, a transfer, any payment) and the package is active, the draft is re-read
 * and booked through the assistant's own course booking (SalesCourse.options + BookingService), so
 * the guardian's confirmation and the teacher's notice go out as for any booking; a webhook retry
 * replays it (draftRequestId). A clash then books nothing, keeps the draft as the wizard's prefill
 * and tells the assistant and the admins to pick again. A draft saved after the payment landed
 * (or for a package no longer held) books at once.
 */
@Injectable()
export class CourseDrafts implements OnModuleInit {
  private readonly log = new Logger(CourseDrafts.name);

  constructor(
    private readonly repo: CourseDraftRepo,
    private readonly env: CourseDraftEnv,
    private readonly events: PackageEvents,
  ) {}

  onModuleInit(): void {
    this.events.onPaid(async (subscriptionId) => {
      const outcome = await this.confirm(subscriptionId);
      if (outcome !== 'none') this.log.log(`course draft ${subscriptionId}: ${outcome}`);
    });
  }

  /** PUT /sales/booking/course/draft: the same scope and course guard as «احجز». */
  async save(req: BookingRequest, user: AuthUser): Promise<CourseDraftSaved> {
    const { opts } = await this.env.sales.allowed(req, user);
    const subscriptionId = opts?.course?.subscriptionId;
    if (!subscriptionId) throw domainError(HttpStatus.BAD_REQUEST, 'course_required');
    if (!(await this.repo.held(subscriptionId))) return this.bookNow(req, user);
    const savedAt = await this.repo.save({ subscriptionId, request: req, savedBy: user.id });
    // The payment may have landed while saving (its confirm read no draft yet): book it now.
    if (await this.repo.held(subscriptionId)) return { state: 'draft', saved_at: savedAt };
    await this.repo.remove(subscriptionId);
    return this.bookNow(req, user);
  }

  /** Books the package's draft once it is active; idempotent. Throws only on a server failure. */
  async confirm(subscriptionId: string, now = new Date()): Promise<ConfirmOutcome> {
    const draft = await this.repo.get(subscriptionId);
    if (!draft) return 'none';
    if ((await this.repo.status(subscriptionId)) !== 'active') return 'held';
    if (await this.repo.booked(subscriptionId)) return this.done(subscriptionId);
    return this.book(draft, now);
  }

  private async bookNow(req: BookingRequest, user: AuthUser): Promise<CourseDraftSaved> {
    return { state: 'booked', booking: await this.env.sales.book(req, user) };
  }

  private async book(draft: CourseDraft, now: Date): Promise<ConfirmOutcome> {
    const req = confirmRequest(draft, now);
    try {
      const opts = await this.env.course.options(req, draft.subscriptionId);
      await this.env.booking.book(req, draft.savedBy, opts);
    } catch (e) {
      // A refusal she can act on (409 conflict, course_exists, 400 date…); else a failure.
      if (!(e instanceof HttpException) || e.getStatus() >= 500) throw e;
      const who = { savedBy: draft.savedBy, savedAt: draft.savedAt };
      await this.env.due.clash(draft.subscriptionId, who);
      return 'clash';
    }
    return this.done(draft.subscriptionId);
  }

  private async done(subscriptionId: string): Promise<ConfirmOutcome> {
    await this.repo.remove(subscriptionId);
    return 'booked';
  }
}
