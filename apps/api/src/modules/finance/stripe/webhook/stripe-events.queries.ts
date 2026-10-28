import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';

/**
 * stripe_events: the webhook's idempotency by event.id (primary key). begin() inserts the event once and
 * says whether it was already processed; an event whose handling failed (no processed_at) runs again on
 * Stripe's retry, every step of it being idempotent itself.
 */
@Injectable()
export class StripeEventsQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** true = already processed: skip it. */
  async begin(event: { id: string; type: string }): Promise<boolean> {
    const { error } = await this.db.from('stripe_events').upsert({ event_id: event.id, type: event.type }, { onConflict: 'event_id', ignoreDuplicates: true });
    if (error) throw new Error(`stripe_events insert failed: ${error.message}`);
    const { data, error: readError } = await this.db.from('stripe_events').select('processed_at').eq('event_id', event.id).single();
    if (readError) throw new Error(`stripe_events read failed: ${readError.message}`);
    return data.processed_at !== null;
  }

  async done(eventId: string, result: string): Promise<void> {
    const { error } = await this.db.from('stripe_events').update({ processed_at: new Date().toISOString(), result }).eq('event_id', eventId);
    if (error) throw new Error(`stripe_events update failed: ${error.message}`);
  }
}
