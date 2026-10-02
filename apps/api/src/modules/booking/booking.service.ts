import type { BookingRequest, BookingResult, Conflict } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { MessageSender } from '../whatsapp/message.sender';
import { BookingPlanner } from './booking.planner';
import { BookingQueries } from './booking.queries';

/**
 * POST /booking (R-SCH-06, R-SCH-04, R-LEAD-06): plan + conflict check, then ONE transaction
 * (create_booking RPC) for guardian/student, rule, lessons, lead status, queued messages and the
 * audit row with the override reason and the conflicts it overrode (R-NFR-03). A replay with the
 * same clientRequestId returns the first booking (rule 8). The sender is kicked so the
 * confirmation goes out now, not at the next tick (it sends only when the gate is open).
 */
@Injectable()
export class BookingService {
  constructor(
    private readonly planner: BookingPlanner,
    private readonly queries: BookingQueries,
    private readonly sender: MessageSender,
  ) {}

  /** POST /booking/check: what «احجز» would clash with, before the review step. */
  check(req: BookingRequest): Promise<Conflict[]> {
    return this.planner.conflicts(req);
  }

  async book(req: BookingRequest, actorId: string): Promise<BookingResult> {
    const { payload } = await this.planner.prepare(req);
    const result = await this.queries.createBooking(payload, actorId);
    void this.sender.kick();
    return result;
  }
}
