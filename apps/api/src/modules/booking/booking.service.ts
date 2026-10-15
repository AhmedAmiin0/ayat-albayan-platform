import type { BookingRequest, BookingResult, Conflict } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { BookingPlanner } from './booking.planner';
import { BookingQueries } from './booking.queries';
import { BookingWriter } from './booking.writer';

/**
 * POST /booking (R-SCH-06, R-SCH-04, R-LEAD-06, R-SCH-10, R-PAY-03): plan + conflict check, then
 * ONE transaction (create_booking RPC) for guardian/student, rule, lessons, lead status, queued
 * messages, the invoice and the audit row with the override reason and the conflicts it overrode
 * (R-NFR-03). A replay with the same clientRequestId returns the first booking (rule 8), re-running
 * only the idempotent trial status follow-up (BookingWriter.replayed). Every kind
 * but trial stores its invoice (BookingWriter).
 */
@Injectable()
export class BookingService {
  constructor(
    private readonly planner: BookingPlanner,
    private readonly writer: BookingWriter,
    private readonly queries: BookingQueries,
  ) {}

  /** POST /booking/check: what «احجز» would clash with, before the review step. */
  check(req: BookingRequest): Promise<Conflict[]> {
    return this.planner.conflicts(req);
  }

  async book(req: BookingRequest, actorId: string): Promise<BookingResult> {
    // The same request again (a retry, a double click) returns its booking before anything is
    // planned: its own lessons would otherwise show up as clashes.
    const first = req.clientRequestId ? await this.queries.replay(req.clientRequestId) : null;
    if (first) return this.writer.replayed({ req, result: first, actorId });
    const prepared = await this.planner.prepare(req);
    return this.writer.write({ req, prepared, actorId });
  }
}
