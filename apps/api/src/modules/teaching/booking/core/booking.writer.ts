import type { BookingRequest, BookingResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BookingFollowUps } from './booking.follow-ups';
import { BookingInvoices } from '@/modules/teaching/booking/invoice/booking.invoice';
import { withInvoice } from './booking.payload';
import type { Prepared } from '@/modules/teaching/booking/plan/booking.planner';
import { BookingRepo } from './booking.repo';

type BookingWrite = { req: BookingRequest; prepared: Prepared; actorId: string };

/**
 * The write half of POST /booking: the invoice file is resolved only now, after the plan passed
 * (a clash or a bad lesson never copies a WhatsApp file), then everything goes through the one
 * create_booking transaction. Then a trial booking moves its students to trial (owner 2026-10-15) and
 * the teacher hears about it (bell + WhatsApp, R-NOT-03, BookingFollowUps) and the sender is kicked so the confirmations go out now, not at the next tick (it sends only when the
 * gate is open).
 */
@Injectable()
export class BookingWriter {
  constructor(
    private readonly queries: BookingRepo,
    private readonly invoices: BookingInvoices,
    private readonly after: BookingFollowUps,
  ) {}

  async write({ req, prepared, actorId }: BookingWrite): Promise<BookingResult> {
    const { phones, invoiceMaxBytes: maxBytes, invoiceWaived: waived } = prepared;
    const invoice = await this.invoices.resolve(req, { phones, maxBytes, waived });
    const result = await this.queries.createBooking(withInvoice(prepared.payload, invoice), actorId);
    await this.after.afterBooking({ req, result, actorId });
    return result;
  }

  /** A replay returns the first booking: only the idempotent trial status follow-up runs again. */
  async replayed(done: { req: BookingRequest; result: BookingResult; actorId: string }): Promise<BookingResult> {
    await this.after.afterReplay(done);
    return done.result;
  }
}
