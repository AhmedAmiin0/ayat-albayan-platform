import type { BookingRequest, BookingResult, CourseDraftSaved } from '@ab/shared';
import { HttpException, HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import type { AuthUser } from '@/common/auth/verify-token';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { CourseDraftEnv } from './course-draft.env';
import { CourseDraftRepo } from './course-draft.repo';
import { confirmRequest, type CourseDraft } from './course-draft.rules';

/** A confirm: nothing to book, still unpaid, booked (now or before), or a clash kept the draft. */
type ConfirmOutcome = 'none' | 'held' | 'booked' | 'clash' | 'failed';

/** create_booking's refusal: the package got its course meanwhile (migration 20261106000501). */
const courseExists = z.object({ code: z.literal('course_exists') });
const isCourseExists = (e: unknown): boolean =>
  e instanceof HttpException && courseExists.safeParse(e.getResponse()).success;

/**
 * «اختر أيام الحلقات» before the payment (owner 2026-11-06). While the package is unpaid with an
 * open payment link (hold mode) the wizard's picks are a DRAFT: saved (and saved again to edit) on
 * the package, nothing written to schedule_rules / lessons, nobody told; teachers' slots are not
 * held (a clash is checked again at payment). Once a payment is recorded (PackageEvents: the
 * webhook after markPaid, a transfer, any recompute that activates it) and the package is active,
 * the draft is re-read and booked through the assistant's own course booking (SalesCourse.options +
 * BookingService) with the version's key (draftRequestId), so a retry replays it. A clash then
 * books nothing, keeps the draft as the wizard's prefill and tells the assistant and the admins.
 * A package no longer held books at once; a draft saved while the payment lands is booked as the
 * SAVED row with the same key as the payment's, so both collapse on create_booking's unique
 * client_request_id (and its one-course-per-package lock, PR #648 review).
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
    // A retry after «booked at once» replays that booking (POST's rule), never course_exists.
    if (await this.env.course.isReplay(req)) return this.bookNow(req, user);
    return this.draftOrBook(req, user);
  }

  private async draftOrBook(req: BookingRequest, user: AuthUser): Promise<CourseDraftSaved> {
    const { opts } = await this.env.sales.allowed(req, user);
    const subscriptionId = opts?.course?.subscriptionId;
    if (!subscriptionId) throw domainError(HttpStatus.BAD_REQUEST, 'course_required');
    if (!(await this.repo.held(subscriptionId))) return this.bookNow(req, user);
    const mine = { subscriptionId, request: req, savedBy: user.id };
    const savedAt = await this.repo.save(mine);
    if (await this.repo.held(subscriptionId)) return { state: 'draft', saved_at: savedAt };
    return this.bookSaved({ ...mine, savedAt });
  }

  /**
   * The payment landed while saving: the saved row (re-read; ours when the payment's confirm took
   * it already) is booked with the draft key, so it replays whatever that confirm booked.
   */
  private async bookSaved(mine: CourseDraft): Promise<CourseDraftSaved> {
    const draft = (await this.repo.get(mine.subscriptionId)) ?? mine;
    const booking = await this.bookDraft(draft, new Date());
    await this.repo.remove(draft);
    return { state: 'booked', booking };
  }

  /** Books the package's draft once it is active; idempotent; a miss tells the staff. */
  async confirm(subscriptionId: string, now = new Date()): Promise<ConfirmOutcome> {
    const draft = await this.repo.get(subscriptionId);
    if (!draft) return 'none';
    if ((await this.repo.status(subscriptionId)) !== 'active') return 'held';
    if (await this.env.course.isBooked(subscriptionId)) return this.done(draft);
    return this.book(draft, now);
  }

  private async bookNow(req: BookingRequest, user: AuthUser): Promise<CourseDraftSaved> {
    return { state: 'booked', booking: await this.env.sales.book(req, user) };
  }

  private async book(draft: CourseDraft, now: Date): Promise<ConfirmOutcome> {
    try {
      await this.bookDraft(draft, now);
    } catch (e) {
      return this.missed(draft, e);
    }
    return this.done(draft);
  }

  /** The draft version's booking; replayed (no guard, no plan) once its key booked. */
  private async bookDraft(draft: CourseDraft, now: Date): Promise<BookingResult> {
    const req = confirmRequest(draft, now);
    if (await this.env.course.isReplay(req)) return this.env.booking.book(req, draft.savedBy);
    const opts = await this.env.course.options(req, draft.subscriptionId);
    return this.env.booking.book(req, draft.savedBy, opts);
  }

  /**
   * Not booked. Booked meanwhile («احجز», a redelivered event, course_exists): done, no alert.
   * Else the draft stays (the prefill) and the assistant and admins are told: a refusal she can act
   * on (409 conflict, 400 date…) is a clash; anything else a failure (logged).
   */
  private async missed(draft: CourseDraft, e: unknown): Promise<ConfirmOutcome> {
    const id = draft.subscriptionId;
    if (isCourseExists(e) || (await this.env.course.isBooked(id))) return this.done(draft);
    const reason = e instanceof HttpException && e.getStatus() < 500 ? 'clash' : 'failed';
    this.log.warn(`course draft ${id} ${reason}: ${String(e)}`);
    await this.env.due.clash(id, { savedBy: draft.savedBy, savedAt: draft.savedAt, reason });
    return reason;
  }

  /** Removes THIS version only: an edit saved meanwhile stays. */
  private async done(draft: CourseDraft): Promise<ConfirmOutcome> {
    await this.repo.remove(draft);
    return 'booked';
  }
}
