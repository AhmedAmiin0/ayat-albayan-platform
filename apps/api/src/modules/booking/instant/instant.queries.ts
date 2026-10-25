import type { Json } from '@ab/db';
import type { BookingResult } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../common/db/db.module';
import { dbError } from '../../../common/http/http';
import { toBookingResult, type BookingPayload } from '../core/booking.mapper';

/** The write of POST /lessons/instant: create_booking + the instant flags, in one transaction (migration 190). */
@Injectable()
export class InstantQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(payload: BookingPayload, actorId: string): Promise<BookingResult> {
    const p_booking = payload as unknown as Json; // typed payload; create_booking validates it in SQL
    const call = () => this.db.rpc('create_instant_lesson', { p_booking, p_actor: actorId });
    let { data, error } = await call();
    // Two replays at once: the loser hits client_request_id's unique key; the retry returns the winner's.
    if (error?.code === '23505' && error.message.includes('client_request_id')) ({ data, error } = await call());
    if (error) throw dbError(error);
    return toBookingResult(data);
  }
}
