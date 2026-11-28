import type { Conflict, Occurrence } from '@ab/schedule';
import type { BookingPayload } from '@/modules/teaching/booking/core/booking.mapper';
import type { CourseLabel } from '@/modules/teaching/booking/core/booking.payload';
import type { Resolved } from '@/modules/teaching/booking/core/booking.parties';
import type { BookingTeacher } from '@/modules/teaching/booking/core/types';
import type { Plan } from './booking.plan';

export interface Prepared {
  payload: BookingPayload;
  conflicts: Conflict[];
  /** E.164 of every booked guardian: the only chats an invoice may be saved from (R-MSG-06). */
  phones: string[];
  /** settings.upload_max_mb in bytes: the invoice file must not be larger. */
  invoiceMaxBytes: number;
  /** The booking may go without an invoice (PrepareOptions.invoiceWaived). */
  invoiceWaived: boolean;
}

/**
 * Server-side choices of the caller, never of the request body: the assistant's course of a
 * subscription she sold (SalesBookingService) has no invoice (the transfer is recorded later on the
 * subscription, decision 2) and ends on its N-th lesson (decision 1). The admin
 * passes none: invoice_required and open-ended rules, as before.
 */
export interface PrepareOptions {
  invoiceWaived?: boolean;
  /**
   * Every rule's ends_on (plannedCourseEnd): the whole course is planned and checked, nothing after
   * it.
   */
  endsOn?: string | null;
  /** The subscription it books: every rule's package and subscription_id (CourseLabel). */
  course?: CourseLabel;
  /** The upcoming trial being moved. */
  excludeLessonIds?: readonly string[];
}

export interface Series {
  plan: Plan;
  siblings: Plan[];
  first: Occurrence;
  conflicts: Conflict[];
}

export interface SeriesContext {
  teacher: BookingTeacher;
  who: Resolved;
  endsOn?: string | null | undefined;
  exclude?: readonly string[] | undefined;
}
