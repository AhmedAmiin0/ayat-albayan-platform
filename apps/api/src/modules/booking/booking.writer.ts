import type { BookingRequest, BookingResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { MessageSender } from '../whatsapp/message.sender';
import { BookingInvoices } from './booking.invoice';
import { withInvoice } from './booking.payload';
import type { Prepared } from './booking.planner';
import { BookingQueries } from './booking.queries';

export type BookingWrite = { req: BookingRequest; prepared: Prepared; actorId: string };

/**
 * The write half of POST /booking: the invoice file is resolved only now, after the plan passed
 * (a clash or a bad lesson never copies a WhatsApp file), then everything goes through the one
 * create_booking transaction and the sender is kicked so the confirmation goes out now, not at the
 * next tick (it sends only when the gate is open).
 */
@Injectable()
export class BookingWriter {
  constructor(
    private readonly queries: BookingQueries,
    private readonly invoices: BookingInvoices,
    private readonly sender: MessageSender,
  ) {}

  async write({ req, prepared, actorId }: BookingWrite): Promise<BookingResult> {
    const invoice = await this.invoices.resolve(req, { phones: prepared.phones, maxBytes: prepared.invoiceMaxBytes });
    const result = await this.queries.createBooking(withInvoice(prepared.payload, invoice), actorId);
    void this.sender.kick();
    return result;
  }
}
