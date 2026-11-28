import type { Json } from '@ab/db';
import type { BookingResult } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { pgError, uniqueViolationMentions } from '@/common/db/errors';
import {
  toBookingResult,
  type BookingPayload,
} from '@/modules/teaching/booking/core/booking.mapper';

/**
 * The write of POST /lessons/instant: create_booking + the instant flags, in one transaction
 * (migration 190).
 */
@Injectable()
export class InstantRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async create(payload: BookingPayload, actorId: string): Promise<BookingResult> {
    // create_booking validates the typed payload in SQL.
    const p_booking = payload as unknown as Json;
    const call = () => this.db.rpc('create_instant_lesson', { p_booking, p_actor: actorId });
    let { data, error } = await call();
    // Two replays at once: the loser hits client_request_id's unique key; the retry returns the
    // winner's.
    if (uniqueViolationMentions(error, 'client_request_id')) ({ data, error } = await call());
    if (error) throw pgError(error);
    return toBookingResult(data);
  }
}
