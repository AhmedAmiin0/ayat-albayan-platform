import type { BookingRequest, BookingResult, CourseDraftSaved } from '@ab/shared';
import { HttpException, HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import { domainError } from '@/modules/teaching/booking/booking.errors';
import { CourseDraftEnv } from './course-draft.env';
import { CourseDraftRepo } from './course-draft.repo';
import { confirmRequest, type CourseDraft } from './course-draft.rules';

/** A confirm: nothing to book, still unpaid, booked (now or before), or a clash kept the draft. */
type ConfirmOutcome = 'none' | 'held' | 'booked' | 'clash' | 'failed';

/** Unpaid with an open link: picks are a draft, booked on payment with a shared idempotency key. */
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

  /** Same scope and course guard as booking. */
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
   * it already) is booked with the draft key, so it replays whatever that confirm booked. Refused
   * (another version won the race): the row goes once the package has its course, then rethrown.
   */
  private async bookSaved(mine: CourseDraft): Promise<CourseDraftSaved> {
    const draft = (await this.repo.get(mine.subscriptionId)) ?? mine;
    try {
      const booking = await this.bookDraft(draft, new Date());
      await this.repo.remove(draft);
      return { state: 'booked', booking };
    } catch (e) {
      if (await this.env.course.isBooked(draft.subscriptionId)) await this.repo.remove(draft);
      throw e;
    }
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

  /** Booked meanwhile is done; a refusable error keeps the draft; others are failures. */
  private async missed(draft: CourseDraft, e: unknown): Promise<ConfirmOutcome> {
    const id = draft.subscriptionId;
    if (await this.env.course.isBooked(id)) return this.done(draft);
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
